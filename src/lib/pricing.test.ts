import { describe, it, expect } from "vitest";
import {
  calculatePrice,
  splitDriverEarnings,
  isNightPickup,
  isWeekendPickup,
  getBrusselsParts,
  DEFAULT_PRICING_RULES,
  type VehicleRates,
  type PricingRules,
} from "./pricing";

/* The three cars in the fleet, exactly as quoted by the operator:
   E  3.00 EUR/km   80 EUR/h   min  80 EUR HTVA
   V  3.50 EUR/km   90 EUR/h   min  90 EUR HTVA
   S  4.00 EUR/km  110 EUR/h   min 110 EUR HTVA */
const CLASSE_E: VehicleRates = {
  pricePerKmCents: 300,
  pricePerHourCents: 8000,
  minimumPriceCents: 8000,
};
const CLASSE_V: VehicleRates = {
  pricePerKmCents: 350,
  pricePerHourCents: 9000,
  minimumPriceCents: 9000,
};
const CLASSE_S: VehicleRates = {
  pricePerKmCents: 400,
  pricePerHourCents: 11000,
  minimumPriceCents: 11000,
};

describe("transfer pricing", () => {
  it("charges the metered per-km fare once it clears the minimum", () => {
    // 50 km x 3.00 EUR = 150.00 EUR HTVA
    const q = calculatePrice({
      serviceType: "transfer",
      rates: CLASSE_E,
      distanceMeters: 50_000,
    });
    expect(q.htvaCents).toBe(15_000);
    expect(q.minimumApplied).toBe(false);
    expect(q.vatCents).toBe(900); // 6%
    expect(q.ttcCents).toBe(15_900);
  });

  it("floors a short ride at the vehicle minimum", () => {
    // 5 km x 3.00 EUR = 15.00 EUR, below the 80 EUR minimum
    const q = calculatePrice({
      serviceType: "transfer",
      rates: CLASSE_E,
      distanceMeters: 5_000,
    });
    expect(q.baseCents).toBe(8_000);
    expect(q.minimumApplied).toBe(true);
    expect(q.htvaCents).toBe(8_000);
    expect(q.ttcCents).toBe(8_480);
    expect(q.lines.find((l) => l.key === "minimum_adjustment")?.amountCents).toBe(6_500);
  });

  it("applies each vehicle's own rate and minimum", () => {
    const distanceMeters = 10_000; // 10 km
    expect(calculatePrice({ serviceType: "transfer", rates: CLASSE_E, distanceMeters }).htvaCents)
      .toBe(8_000); // 30 EUR metered -> 80 EUR minimum
    expect(calculatePrice({ serviceType: "transfer", rates: CLASSE_V, distanceMeters }).htvaCents)
      .toBe(9_000); // 35 EUR metered -> 90 EUR minimum
    expect(calculatePrice({ serviceType: "transfer", rates: CLASSE_S, distanceMeters }).htvaCents)
      .toBe(11_000); // 40 EUR metered -> 110 EUR minimum
  });

  it("prices a real Brussels airport run", () => {
    // Brussels Airport -> Grand Place is about 14 km; still under the E minimum.
    const q = calculatePrice({
      serviceType: "transfer",
      rates: CLASSE_S,
      distanceMeters: 14_200,
    });
    expect(q.lines[0].detail).toBe("14.2 km x 4.00 EUR/km");
    expect(q.htvaCents).toBe(11_000);
  });

  it("scales to long-distance transfers", () => {
    // Brussels -> Paris, roughly 320 km, in a Classe V
    const q = calculatePrice({
      serviceType: "transfer",
      rates: CLASSE_V,
      distanceMeters: 320_000,
    });
    expect(q.htvaCents).toBe(112_000); // 320 x 3.50
    expect(q.ttcCents).toBe(118_720);
  });

  it("rounds fractional distances to a whole cent", () => {
    const q = calculatePrice({
      serviceType: "transfer",
      rates: CLASSE_V,
      distanceMeters: 33_333, // 33.333 km x 3.50 = 116.6655 EUR
    });
    expect(q.htvaCents).toBe(11_667);
    expect(Number.isInteger(q.htvaCents)).toBe(true);
    expect(Number.isInteger(q.vatCents)).toBe(true);
  });
});

describe("disposal pricing", () => {
  it("charges per retained hour", () => {
    const q = calculatePrice({
      serviceType: "disposal",
      rates: CLASSE_V,
      durationHours: 4,
    });
    expect(q.htvaCents).toBe(36_000); // 4 x 90
    expect(q.ttcCents).toBe(38_160);
  });

  it("floors a single hour at the minimum, which equals the hourly rate", () => {
    const q = calculatePrice({
      serviceType: "disposal",
      rates: CLASSE_S,
      durationHours: 1,
    });
    expect(q.htvaCents).toBe(11_000);
    expect(q.minimumApplied).toBe(false); // 1 x 110 already meets the 110 minimum
  });

  it("ignores distance entirely", () => {
    const withDistance = calculatePrice({
      serviceType: "disposal",
      rates: CLASSE_E,
      durationHours: 3,
      distanceMeters: 400_000,
    });
    expect(withDistance.htvaCents).toBe(24_000); // 3 x 80, distance disregarded
  });

  it("prices a full day", () => {
    const q = calculatePrice({ serviceType: "disposal", rates: CLASSE_S, durationHours: 10 });
    expect(q.htvaCents).toBe(110_000);
    expect(q.vatCents).toBe(6_600);
    expect(q.ttcCents).toBe(116_600);
  });
});

describe("surcharges", () => {
  const rules: PricingRules = {
    ...DEFAULT_PRICING_RULES,
    nightSurchargeBps: 1500, // +15%
    weekendSurchargeBps: 1000, // +10%
    stopFeeCents: 1500, // 15 EUR per stop
  };

  it("adds nothing by default", () => {
    const q = calculatePrice({
      serviceType: "transfer",
      rates: CLASSE_E,
      distanceMeters: 100_000,
      stopCount: 2,
      scheduledAt: new Date("2026-10-11T02:00:00Z"), // a Sunday night
    });
    expect(q.htvaCents).toBe(30_000); // exactly 100 km x 3.00, no uplift
    expect(q.lines.some((l) => l.key === "night")).toBe(false);
  });

  it("applies the night uplift on the floored base", () => {
    // Monday 2026-10-12, 23:30 Brussels time
    const q = calculatePrice({
      serviceType: "transfer",
      rates: CLASSE_E,
      distanceMeters: 100_000,
      scheduledAt: new Date("2026-10-12T21:30:00Z"),
      rules,
    });
    expect(q.baseCents).toBe(30_000);
    expect(q.lines.find((l) => l.key === "night")?.amountCents).toBe(4_500);
    expect(q.htvaCents).toBe(34_500);
  });

  it("charges per intermediate stop on a transfer only", () => {
    const transfer = calculatePrice({
      serviceType: "transfer",
      rates: CLASSE_E,
      distanceMeters: 100_000,
      stopCount: 3,
      rules,
    });
    expect(transfer.lines.find((l) => l.key === "stops")?.amountCents).toBe(4_500);

    const disposal = calculatePrice({
      serviceType: "disposal",
      rates: CLASSE_E,
      durationHours: 5,
      stopCount: 3,
      rules,
    });
    expect(disposal.lines.some((l) => l.key === "stops")).toBe(false);
  });

  it("stacks night and weekend uplifts", () => {
    // Saturday 2026-10-17, 23:00 Brussels time
    const q = calculatePrice({
      serviceType: "disposal",
      rates: CLASSE_V,
      durationHours: 4,
      scheduledAt: new Date("2026-10-17T21:00:00Z"),
      rules,
    });
    expect(q.baseCents).toBe(36_000);
    expect(q.lines.find((l) => l.key === "night")?.amountCents).toBe(5_400);
    expect(q.lines.find((l) => l.key === "weekend")?.amountCents).toBe(3_600);
    expect(q.htvaCents).toBe(45_000);
  });
});

describe("Brussels time handling", () => {
  it("reads the local hour through summer time, not the server's UTC", () => {
    // Brussels is UTC+2 in July: 21:00 UTC is 23:00 local, inside the window.
    const summerNight = new Date("2026-07-15T21:00:00Z");
    expect(getBrusselsParts(summerNight).hour).toBe(23);
    expect(isNightPickup(summerNight, { ...DEFAULT_PRICING_RULES })).toBe(true);

    // Brussels is UTC+1 in January: 21:00 UTC is 22:00 local, also inside.
    const winterNight = new Date("2026-01-15T21:00:00Z");
    expect(getBrusselsParts(winterNight).hour).toBe(22);
    expect(isNightPickup(winterNight, DEFAULT_PRICING_RULES)).toBe(true);

    // 19:00 UTC in January is 20:00 local: daytime.
    expect(isNightPickup(new Date("2026-01-15T19:00:00Z"), DEFAULT_PRICING_RULES)).toBe(false);
  });

  it("treats the wrapping night window correctly at both ends", () => {
    const r = DEFAULT_PRICING_RULES; // 22:00 -> 06:00
    expect(isNightPickup(new Date("2026-01-15T21:00:00Z"), r)).toBe(true); // 22:00 local
    expect(isNightPickup(new Date("2026-01-16T04:59:00Z"), r)).toBe(true); // 05:59 local
    expect(isNightPickup(new Date("2026-01-16T05:00:00Z"), r)).toBe(false); // 06:00 local
  });

  it("identifies weekends in local time", () => {
    // Saturday 2026-10-17 in Brussels
    expect(isWeekendPickup(new Date("2026-10-17T10:00:00Z"))).toBe(true);
    // Friday 2026-10-16 at 23:00 UTC is already Saturday 01:00 in Brussels
    expect(isWeekendPickup(new Date("2026-10-16T23:00:00Z"))).toBe(true);
    expect(isWeekendPickup(new Date("2026-10-15T10:00:00Z"))).toBe(false); // Thursday
  });
});

describe("driver earnings", () => {
  it("splits the fare at the driver's commission rate", () => {
    const { commissionCents, driverEarningsCents } = splitDriverEarnings(15_000, 2000);
    expect(commissionCents).toBe(3_000);
    expect(driverEarningsCents).toBe(12_000);
  });

  it("never loses a cent to rounding", () => {
    for (const fare of [8_000, 11_667, 33_333, 45_001, 1]) {
      const { commissionCents, driverEarningsCents } = splitDriverEarnings(fare, 1750);
      expect(commissionCents + driverEarningsCents).toBe(fare);
    }
  });

  it("gives the driver the whole fare at zero commission", () => {
    expect(splitDriverEarnings(20_000, 0)).toEqual({
      commissionCents: 0,
      driverEarningsCents: 20_000,
    });
  });
});
