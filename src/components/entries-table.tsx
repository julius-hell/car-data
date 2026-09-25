import { getFormatter, getTranslations } from "next-intl/server";
import { DeleteEntryButton } from "@/components/delete-entry-button";
import { EditEntryDialog } from "@/components/edit-entry-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Actor } from "@/lib/actor";
import { isoDateToDate } from "@/lib/dates";
import type { MileageEntry } from "@/lib/db/schema";
import { canModifyEntry } from "@/lib/entries";

export async function EntriesTable({
  actor,
  entries,
  showRecordedBy,
  title,
}: {
  actor: Actor;
  entries: MileageEntry[];
  showRecordedBy: boolean;
  title: string;
}) {
  const [t, format] = await Promise.all([getTranslations("Car"), getFormatter()]);
  const now = new Date();
  const formatDate = (isoDate: string) => format.dateTime(isoDateToDate(isoDate), { dateStyle: "medium" });
  const anyModifiable = entries.some((entry) => canModifyEntry(actor, entry, now));

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <h2 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">{title}</h2>
      {entries.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("noReadings")}</p>
      ) : (
        <div className="bg-card overflow-x-auto rounded-xl border shadow-xs">
          <Table data-testid="entries" className="table-fixed">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-32 pl-4">{t("date")}</TableHead>
                <TableHead className="w-32 text-right">{t("odometer")}</TableHead>
                <TableHead>{t("note")}</TableHead>
                {showRecordedBy && <TableHead className="w-36">{t("recordedBy")}</TableHead>}
                {anyModifiable && <TableHead className="w-20" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => {
                const label = { odometer: format.number(entry.odometer), date: formatDate(entry.recordedAt) };
                return (
                  <TableRow key={entry.id}>
                    <TableCell className="pl-4 whitespace-nowrap tabular-nums">
                      <time dateTime={entry.recordedAt}>{formatDate(entry.recordedAt)}</time>
                    </TableCell>
                    <TableCell className="text-right font-mono whitespace-nowrap tabular-nums">
                      {format.number(entry.odometer)} <span className="text-muted-foreground font-sans">km</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground truncate">{entry.note}</TableCell>
                    {showRecordedBy && (
                      <TableCell className="text-muted-foreground truncate" data-testid="entry-recorded-by">
                        {entry.recordedByName ?? "—"}
                      </TableCell>
                    )}
                    {anyModifiable && (
                      <TableCell className="py-1 pr-2">
                        {canModifyEntry(actor, entry, now) && (
                          <div className="flex justify-end">
                            <EditEntryDialog entry={entry} label={t("editReading", label)} />
                            <DeleteEntryButton entryId={entry.id} label={t("deleteReading", label)} />
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
