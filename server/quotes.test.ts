import { describe, expect, it } from "vitest";
import { calculateQuotePrice, calculateDisposalPrice, getVehicleById, getAllVehicles } from "@shared/vehicles";

describe("Vehicle Pricing Functions", () => {
  describe("calculateQuotePrice", () => {
    it("should calculate quote price for Classe E", () => {
      const price = calculateQuotePrice("classe-e", 50);
      expect(price).toBe(150); // 50km * 3€/km
    });

    it("should calculate quote price for Classe S", () => {
      const price = calculateQuotePrice("classe-s", 50);
      expect(price).toBe(200); // 50km * 4€/km
    });

    it("should calculate quote price for Classe V", () => {
      const price = calculateQuotePrice("classe-v", 50);
      expect(price).toBe(175); // 50km * 3.5€/km
    });

    it("should apply minimum distance for Classe E", () => {
      const price = calculateQuotePrice("classe-e", 5);
      expect(price).toBe(30); // 10km (minimum) * 3€/km
    });

    it("should apply minimum distance for Classe V", () => {
      const price = calculateQuotePrice("classe-v", 10);
      expect(price).toBe(52.5); // 15km (minimum) * 3.5€/km
    });

    it("should return null for invalid vehicle", () => {
      const price = calculateQuotePrice("invalid-vehicle", 50);
      expect(price).toBeNull();
    });

    it("should handle decimal distances", () => {
      const price = calculateQuotePrice("classe-e", 25.5);
      expect(price).toBe(76.5); // 25.5km * 3€/km
    });
  });

  describe("calculateDisposalPrice", () => {
    it("should calculate disposal price for Classe E", () => {
      const price = calculateDisposalPrice("classe-e", 8);
      expect(price).toBe(600); // 8h * 75€/h
    });

    it("should calculate disposal price for Classe S", () => {
      const price = calculateDisposalPrice("classe-s", 8);
      expect(price).toBe(760); // 8h * 95€/h
    });

    it("should calculate disposal price for Classe V", () => {
      const price = calculateDisposalPrice("classe-v", 8);
      expect(price).toBe(680); // 8h * 85€/h
    });

    it("should return null for invalid vehicle", () => {
      const price = calculateDisposalPrice("invalid-vehicle", 8);
      expect(price).toBeNull();
    });

    it("should handle decimal hours", () => {
      const price = calculateDisposalPrice("classe-e", 2.5);
      expect(price).toBe(187.5); // 2.5h * 75€/h
    });
  });

  describe("getVehicleById", () => {
    it("should return vehicle for valid ID", () => {
      const vehicle = getVehicleById("classe-e");
      expect(vehicle).toBeDefined();
      expect(vehicle?.name).toBe("Mercedes Classe E");
      expect(vehicle?.pricePerKm).toBe(3);
    });

    it("should return undefined for invalid ID", () => {
      const vehicle = getVehicleById("invalid-id");
      expect(vehicle).toBeUndefined();
    });

    it("should return all vehicle properties", () => {
      const vehicle = getVehicleById("classe-s");
      expect(vehicle).toHaveProperty("id");
      expect(vehicle).toHaveProperty("name");
      expect(vehicle).toHaveProperty("category");
      expect(vehicle).toHaveProperty("image");
      expect(vehicle).toHaveProperty("description");
      expect(vehicle).toHaveProperty("features");
      expect(vehicle).toHaveProperty("pricePerKm");
      expect(vehicle).toHaveProperty("pricePerHour");
      expect(vehicle).toHaveProperty("minDistance");
    });
  });

  describe("getAllVehicles", () => {
    it("should return all vehicles", () => {
      const vehicles = getAllVehicles();
      expect(vehicles).toHaveLength(3);
    });

    it("should return vehicles with correct IDs", () => {
      const vehicles = getAllVehicles();
      const ids = vehicles.map(v => v.id);
      expect(ids).toContain("classe-e");
      expect(ids).toContain("classe-s");
      expect(ids).toContain("classe-v");
    });

    it("should return vehicles with valid pricing", () => {
      const vehicles = getAllVehicles();
      vehicles.forEach(vehicle => {
        expect(vehicle.pricePerKm).toBeGreaterThan(0);
        expect(vehicle.pricePerHour).toBeGreaterThan(0);
        expect(vehicle.minDistance).toBeGreaterThan(0);
      });
    });
  });
});
