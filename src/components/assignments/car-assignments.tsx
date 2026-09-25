import { getFormatter, getTranslations } from "next-intl/server";
import { AssignForm } from "@/components/assignments/assign-form";
import { EndAssignmentForm } from "@/components/assignments/end-assignment-form";
import { listAssignableMembers, listCarAssignments } from "@/lib/assignments";
import { isoDateToDate } from "@/lib/dates";
import { todayIso } from "@/lib/today";

// Current drivers and the assignment history of one car.
export async function CarAssignments({
  carId,
  organizationId,
  canManage,
}: {
  carId: string;
  organizationId: string;
  canManage: boolean;
}) {
  const [assignments, members, t, format] = await Promise.all([
    listCarAssignments(carId),
    canManage ? listAssignableMembers(organizationId) : Promise.resolve([]),
    getTranslations("Assignments"),
    getFormatter(),
  ]);
  const today = todayIso();
  const formatDate = (iso: string) => format.dateTime(isoDateToDate(iso), { dateStyle: "medium" });
  const current = assignments.filter((a) => a.startsOn <= today && (a.endsOn === null || a.endsOn >= today));
  const other = assignments.filter((a) => !current.includes(a));

  return (
    <section className="bg-card flex flex-col gap-4 rounded-xl border p-4 shadow-xs sm:p-5">
      <h2 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">{t("title")}</h2>
      {current.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("noCurrent")}</p>
      ) : (
        <ul className="flex flex-col gap-2" data-testid="current-assignments">
          {current.map((a) => (
            <li
              key={a.id}
              data-testid="current-assignment"
              className="flex flex-wrap items-center justify-between gap-2 text-sm"
            >
              <span>
                <span className="font-medium">{a.name}</span>{" "}
                <span className="text-muted-foreground">
                  {a.endsOn
                    ? t("fromUntil", { from: formatDate(a.startsOn), until: formatDate(a.endsOn) })
                    : t("since", { from: formatDate(a.startsOn) })}
                </span>
              </span>
              {canManage && <EndAssignmentForm carId={carId} assignmentId={a.id} name={a.name} />}
            </li>
          ))}
        </ul>
      )}
      {canManage && <AssignForm carId={carId} members={members} />}
      {other.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-muted-foreground text-xs font-medium">{t("history")}</h3>
          <ul className="flex flex-col gap-1 text-sm" data-testid="assignment-history">
            {other.map((a) => (
              <li key={a.id} data-testid="past-assignment">
                <span className="font-medium">{a.name}</span>{" "}
                <span className="text-muted-foreground">
                  {a.endsOn
                    ? t("fromUntil", { from: formatDate(a.startsOn), until: formatDate(a.endsOn) })
                    : t("since", { from: formatDate(a.startsOn) })}
                  {a.startsOn > today && ` · ${t("upcoming")}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
