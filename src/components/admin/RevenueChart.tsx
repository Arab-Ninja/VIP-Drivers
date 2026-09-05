"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCents } from "@/lib/pricing";
import { useI18n } from "@/i18n/client";

/** Paid revenue per day over the last 30 days. */
export function RevenueChart({
  data,
}: {
  data: { date: string; revenueCents: number; bookings: number }[];
}) {
  const { intl } = useI18n();

  const chartData = data.map((d) => ({
    ...d,
    label: new Intl.DateTimeFormat(intl, { day: "2-digit", month: "2-digit" }).format(
      new Date(`${d.date}T12:00:00Z`),
    ),
    revenue: d.revenueCents / 100,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c8a45d" stopOpacity={0.42} />
              <stop offset="100%" stopColor="#c8a45d" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#2a2a31" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#8a8a94", fontSize: 10 }}
            axisLine={{ stroke: "#2a2a31" }}
            tickLine={false}
            interval={4}
          />
          <YAxis
            tick={{ fill: "#8a8a94", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v} €`}
            width={62}
          />
          <Tooltip
            contentStyle={{
              background: "#101013",
              border: "1px solid #2a2a31",
              borderRadius: 6,
              fontSize: 12,
            }}
            labelStyle={{ color: "#e4e4e7" }}
            formatter={(value: number, _n, entry) => [
              `${formatCents(Math.round(value * 100), intl)} · ${entry.payload.bookings}`,
              "",
            ]}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#c8a45d"
            strokeWidth={2}
            fill="url(#revenueFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
