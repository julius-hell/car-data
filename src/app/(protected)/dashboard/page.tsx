import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { dueItemTitle, dueItemWhen } from "@/components/dashboard/due-item-text";
import { DueBadge } from "@/components/due-badge";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { requirePermission } from "@/lib/actor";
import { collectDueItems, countByLevel, dueItemLink, type DueItem } from "@/lib/due-items";
import { intervalTypeName } from "@/lib/interval-names";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard");
  return { title: t("title") };
}

const param = (value: string | string[] | undefined) => (typeof value === "string" && value ? value : undefined);

type Filter = { car?: string; type?: string; location?: string; costCenter?: string };

function matches(item: DueItem, filter: Filter) {
  if (filter.car && item.car?.id !== filter.car) return false;
  if (filter.location && item.car?.location !== filter.location) return false;
  if (filter.costCenter && item.car?.costCenter !== filter.costCenter) return false;
  if (filter.type) {
    const key = item.intervalType ? item.intervalType.id : item.kind;
    if (key !== filter.type) return false;
  }
  return true;
}

// Everything overdue, due soon or missing a due date across the fleet, most urgent first.
export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const actor = await requirePermission("viewFleet");
  const searchParams = await props.searchParams;
  const filter: Filter = {
    car: param(searchParams.car),
    type: param(searchParams.type),
    location: param(searchParams.location),
    costCenter: param(searchParams.costCenter),
  };
  const [all, t, ti] = await Promise.all([
    collectDueItems(actor),
    getTranslations("Dashboard"),
    getTranslations("Intervals"),
  ]);
  const items = all.filter((item) => matches(item, filter));
  const counts = countByLevel(items);
  const filtered = Object.values(filter).some(Boolean);

  const unique = <T,>(values: (T | null | undefined)[]) => [...new Set(values.filter((v): v is T => v != null))];
  const cars = unique(all.map((i) => i.car?.id)).map((id) => all.find((i) => i.car?.id === id)!.car!);
  cars.sort((a, b) => a.licencePlate.localeCompare(b.licencePlate));
  const types = new Map<string, string>();
  for (const item of all) {
    const key = item.intervalType ? item.intervalType.id : item.kind;
    if (!types.has(key)) types.set(key, item.intervalType ? intervalTypeName(item.intervalType, ti) : t(`kinds.${item.kind}`));
  }
  const locations = unique(all.map((i) => i.car?.location)).sort();
  const costCenters = unique(all.map((i) => i.car?.costCenter)).sort();
  const rows = await Promise.all(
    items.map(async (item) => ({ item, title: await dueItemTitle(item), when: await dueItemWhen(item) })),
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <div>
        <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">{t("eyebrow")}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{t("heading")}</h1>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(["overdue", "soon", "missing"] as const).map((level) => (
          <div key={level} className="bg-card flex flex-col gap-1 rounded-xl border p-4 shadow-xs" data-testid={`count-${level}`}>
            <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">{t(`counts.${level}`)}</p>
            <p
              className={cn(
                "font-mono text-2xl font-semibold tabular-nums",
                level === "overdue" && counts.overdue > 0 && "text-destructive",
              )}
              data-testid="count-value"
            >
              {counts[level]}
            </p>
          </div>
        ))}
      </div>

      {/* Keyed by the filter so the selects show it again after client-side navigation. */}
      <form
        method="get"
        key={JSON.stringify(filter)}
        className="bg-card flex flex-wrap items-end gap-3 rounded-xl border p-3 shadow-xs"
      >
        {[
          ["car", t("filterCar"), cars.map((c) => [c.id, c.licencePlate] as const)],
          ["type", t("filterType"), [...types.entries()]],
          ["location", t("filterLocation"), locations.map((l) => [l, l] as const)],
          ["costCenter", t("filterCostCenter"), costCenters.map((c) => [c, c] as const)],
        ].map(([name, label, options]) => (
          <div key={name as string} className="flex flex-col gap-1.5">
            <Label htmlFor={`filter-${name}`}>{label as string}</Label>
            <NativeSelect
              id={`filter-${name}`}
              name={name as string}
              defaultValue={filter[name as keyof Filter] ?? ""}
            >
              <option value="">{t("all")}</option>
              {(options as readonly (readonly [string, string])[]).map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </NativeSelect>
          </div>
        ))}
        <Button type="submit" variant="outline">
          {t("filter")}
        </Button>
        {filtered && (
          <Button variant="ghost" render={<Link href="/dashboard" />}>
            {t("resetFilter")}
          </Button>
        )}
      </form>

      {rows.length === 0 ? (
        <p className="text-muted-foreground bg-card rounded-xl border border-dashed px-6 py-10 text-center text-sm">
          {filtered ? t("noMatches") : t("allClear")}
        </p>
      ) : (
        <ul className="bg-card flex flex-col divide-y rounded-xl border shadow-xs" data-testid="due-items">
          {rows.map(({ item, title, when }) => (
            <li key={item.id} data-testid="due-item" data-kind={item.kind} data-level={item.level}>
              <Link
                href={dueItemLink(item, actor)}
                className="hover:bg-muted/50 flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 transition-colors"
              >
                <DueBadge level={item.level} />
                <span className="font-medium" data-testid="due-item-title">
                  {title}
                </span>
                <span className="font-mono text-sm font-semibold" data-testid="due-item-subject">
                  {item.car?.licencePlate ?? item.person?.name}
                </span>
                <span className="text-muted-foreground ml-auto text-sm">{when}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
