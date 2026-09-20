"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Unit } from "@/lib/db/schema";
import type { MonthDistance } from "@/lib/stats";

export function MonthlyChart({ months, unit }: { months: MonthDistance[]; unit: Unit }) {
  const t = useTranslations("Stats");
  const format = useFormatter();
  const monthLabel = (month: string, style: "short" | "long") =>
    format.dateTime(new Date(`${month}-01T00:00:00Z`), {
      month: style === "short" ? "short" : "long",
      year: style === "long" ? "numeric" : undefined,
    });

  if (months.every((m) => m.distance === null)) {
    return (
      <div
        data-testid="monthly-chart-empty"
        className="text-muted-foreground bg-muted/40 flex h-40 items-center justify-center rounded-lg border border-dashed px-4 text-center text-sm"
      >
        {t("monthlyEmpty")}
      </div>
    );
  }

  const data = months.map((m) => ({ ...m, distance: m.distance ?? 0, missing: m.distance === null }));

  return (
    <div data-testid="monthly-chart" className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }} barCategoryGap="30%">
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeWidth={1} />
          <XAxis
            dataKey="month"
            tickFormatter={(m: string) => monthLabel(m, "short")}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "var(--chart-grid)" }}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis
            tickFormatter={(v: number) => format.number(v)}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={56}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            isAnimationActive={false}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as (typeof data)[number] | undefined;
              if (!active || !point) return null;
              return (
                <div className="bg-popover text-popover-foreground rounded-md border px-3 py-2 text-sm shadow-md">
                  <div className="flex items-center gap-2">
                    <span aria-hidden className="bg-chart-1 inline-block size-2.5 rounded-sm" />
                    <span className="font-semibold tabular-nums">
                      {point.missing ? "—" : `${format.number(point.distance)} ${unit}`}
                    </span>
                  </div>
                  <div className="text-muted-foreground">{monthLabel(point.month, "long")}</div>
                </div>
              );
            }}
          />
          <Bar
            dataKey="distance"
            fill="var(--chart-1)"
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
