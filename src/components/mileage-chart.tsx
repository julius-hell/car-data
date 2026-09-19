"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Unit } from "@/lib/db/schema";

export type MileagePoint = { recordedAt: string; odometer: number };

const DAY_MS = 86_400_000;

const dateFormat = new Intl.DateTimeFormat("en", { day: "numeric", month: "short" });
const dateYearFormat = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const numberFormat = new Intl.NumberFormat("en");

function toTimestamp(isoDate: string) {
  return Date.parse(`${isoDate}T00:00:00Z`);
}

function padDomain(min: number, max: number, pad: number): [number, number] {
  return min === max ? [min - pad, max + pad] : [min, max];
}

// Ticks on clean steps (1, 2, 5 × 10^n) that enclose the readings.
function niceTicks(min: number, max: number, targetCount = 4) {
  const span = Math.max(max - min, 1);
  const rough = span / targetCount;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? magnitude;
  const start = Math.max(0, Math.floor(min / step) * step);
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= end + step / 2; v += step) ticks.push(v);
  return { ticks, domain: [start, ticks[ticks.length - 1]] as [number, number] };
}

export function MileageChart({ points, unit }: { points: MileagePoint[]; unit: Unit }) {
  if (points.length === 0) {
    return (
      <div
        data-testid="mileage-chart-empty"
        className="text-muted-foreground flex h-40 items-center justify-center rounded-lg border border-dashed px-4 text-center text-sm"
      >
        Log a reading to start the chart.
      </div>
    );
  }

  const data = points.map((point) => ({ t: toTimestamp(point.recordedAt), odometer: point.odometer }));
  const times = data.map((d) => d.t);
  const values = data.map((d) => d.odometer);
  const xDomain = padDomain(Math.min(...times), Math.max(...times), DAY_MS);
  const { ticks: yTicks, domain: yDomain } = niceTicks(Math.min(...values), Math.max(...values));
  const spansYears = new Date(xDomain[0]).getUTCFullYear() !== new Date(xDomain[1]).getUTCFullYear();
  const formatTick = (t: number) =>
    (spansYears ? dateYearFormat : dateFormat).format(new Date(t));

  return (
    <div data-testid="mileage-chart" className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeWidth={1} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={xDomain}
            tickFormatter={formatTick}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "var(--chart-grid)" }}
            minTickGap={24}
          />
          <YAxis
            domain={yDomain}
            ticks={yTicks}
            tickFormatter={(v: number) => numberFormat.format(v)}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={56}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
            isAnimationActive={false}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as { t: number; odometer: number } | undefined;
              if (!active || !point) return null;
              return (
                <div className="bg-popover text-popover-foreground rounded-md border px-3 py-2 text-sm shadow-md">
                  <div className="flex items-center gap-2">
                    <span aria-hidden className="bg-chart-1 inline-block h-0.5 w-3 rounded-full" />
                    <span className="font-semibold tabular-nums">
                      {numberFormat.format(point.odometer)} {unit}
                    </span>
                  </div>
                  <div className="text-muted-foreground">{dateYearFormat.format(new Date(point.t))}</div>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="odometer"
            stroke="none"
            fill="var(--chart-1)"
            fillOpacity={0.1}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
            baseValue={yDomain[0]}
          />
          <Line
            type="monotone"
            dataKey="odometer"
            stroke="var(--chart-1)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            dot={{ r: 4, fill: "var(--chart-1)", stroke: "var(--background)", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: "var(--chart-1)", stroke: "var(--background)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
