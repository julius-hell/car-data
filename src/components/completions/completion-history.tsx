import { FileTextIcon } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { CompletionDialog, type CompletionDefaults } from "@/components/completions/completion-dialog";
import { Button } from "@/components/ui/button";
import { isoDateToDate } from "@/lib/dates";
import type { Attachment, Completion } from "@/lib/db/schema";
import type { DuePrecision } from "@/lib/due";

import type { CompletionState as State } from "@/lib/completion-form";

// Past completions of one interval, newest first, with their documents.
export async function CompletionHistory({
  name,
  kind,
  precision,
  hasKm,
  completions,
  editAction,
  deleteAction,
}: {
  name: string;
  kind: "car" | "licence" | "driver";
  precision: DuePrecision;
  hasKm: boolean;
  completions: { completion: Completion; attachments: Attachment[] }[];
  // Present for admins; bound to the interval, taking the completion id.
  editAction?: (completionId: string, previous: State, formData: FormData) => Promise<State>;
  deleteAction?: (completionId: string) => Promise<void>;
}) {
  const [t, format] = await Promise.all([getTranslations("Completions"), getFormatter()]);
  if (completions.length === 0) return null;
  const formatDate = (iso: string) => format.dateTime(isoDateToDate(iso), { dateStyle: "medium" });

  return (
    <details className="group" data-testid="completion-history">
      <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-xs">
        {t("history", { count: completions.length })}
      </summary>
      <ul className="mt-2 flex flex-col gap-2">
        {completions.map(({ completion, attachments }) => {
          const details = [
            completion.result ? t(`results.${completion.result}`) : null,
            completion.odometer !== null ? `${format.number(completion.odometer)} km` : null,
            completion.licenceClasses ? t("classes", { classes: completion.licenceClasses }) : null,
            completion.licenceExpiresOn ? t("expires", { date: formatDate(completion.licenceExpiresOn) }) : null,
            completion.provider,
            completion.costCents !== null
              ? format.number(completion.costCents / 100, { style: "currency", currency: "EUR" })
              : null,
            completion.note,
          ].filter(Boolean);
          const defaults: CompletionDefaults = {
            completedOn: completion.completedOn,
            odometer: completion.odometer,
            result: completion.result,
            provider: completion.provider,
            costCents: completion.costCents,
            note: completion.note,
            licenceClasses: completion.licenceClasses,
            licenceExpiresOn: completion.licenceExpiresOn,
          };
          return (
            <li key={completion.id} data-testid="completion" className="bg-muted/40 flex flex-col gap-1 rounded-lg p-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <span className="font-medium">{formatDate(completion.completedOn)}</span>
                  {details.length > 0 && <span className="text-muted-foreground"> · {details.join(" · ")}</span>}
                </span>
                {editAction && deleteAction && (
                  <span className="flex items-center gap-1">
                    <CompletionDialog
                      action={editAction.bind(null, completion.id)}
                      name={name}
                      kind={kind}
                      precision={precision}
                      hasKm={hasKm}
                      defaults={defaults}
                      triggerLabel={t("edit")}
                      triggerAriaLabel={t("editLabel", { date: formatDate(completion.completedOn) })}
                    />
                    <form action={deleteAction.bind(null, completion.id)}>
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        aria-label={t("deleteLabel", { date: formatDate(completion.completedOn) })}
                      >
                        {t("delete")}
                      </Button>
                    </form>
                  </span>
                )}
              </div>
              {completion.recordedByName && (
                <span className="text-muted-foreground text-xs">{t("recordedBy", { name: completion.recordedByName })}</span>
              )}
              {attachments.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {attachments.map((file) => (
                    <li key={file.id}>
                      <a
                        href={`/attachments/${file.id}`}
                        target="_blank"
                        rel="noreferrer"
                        data-testid="attachment-link"
                        className="text-primary inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline"
                      >
                        <FileTextIcon aria-hidden className="size-3.5" />
                        {file.fileName}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </details>
  );
}
