"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCents } from "@/lib/pricing";
import { useI18n } from "@/i18n/client";

/**
 * Net earnings by month. Bars rather than a line: these are six discrete
 * monthly totals, not a continuous series, and a bar makes a zero month read
 * as "no work" instead of a dip in a trend.
 */
export function EarningsChart({ data }: { data: { month: string; netCents: number; rides: number }[] }) {
  const { t, intl } = useI18n();

  const chartData = data.map((d) => {
    const [year, month] = d.month.split("-");
    const label = new Intl.DateTimeFormat(intl, { month: "short" }).format(
      new Date(Number(year), Number(month) - 1, 1),
    );
    return { ...d, label, net: d.netCents / 100 };
  });

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="#2a2a31" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#8a8a94", fontSize: 11 }}
            axisLine={{ stroke: "#2a2a31" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#8a8a94", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value: number) => `${value} €`}
            width={62}
          />
          <Tooltip
            cursor={{ fill: "rgba(200,164,93,0.07)" }}
            contentStyle={{
              background: "#101013",
              border: "1px solid #2a2a31",
              borderRadius: 6,
              fontSize: 12,
            }}
            labelStyle={{ color: "#e4e4e7" }}
            formatter={(value: number, _name, entry) => [
              `${formatCents(Math.round(value * 100), intl)} · ${entry.payload.rides} ${
                entry.payload.rides === 1 ? "trajet" : "trajets"
              }`,
              t.driver.netEarning,
            ]}
          />
          <Bar dataKey="net" fill="#b8933e" radius={[3, 3, 0, 0]} maxBarSize={54} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
