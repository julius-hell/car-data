import { getActor } from "@/lib/actor";
import { findViewableAttachment, readAttachmentFile } from "@/lib/attachments";
import { getSession } from "@/lib/session";

// Serves an attachment to someone allowed to see it; anyone else gets 404.
export async function GET(_request: Request, context: RouteContext<"/attachments/[attachmentId]">) {
  if (!(await getSession())) return new Response(null, { status: 401 });
  const actor = await getActor();
  const { attachmentId } = await context.params;
  const row = actor ? await findViewableAttachment(actor, attachmentId) : undefined;
  const bytes = row ? await readAttachmentFile(row) : null;
  if (!row || !bytes) return new Response(null, { status: 404 });

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": row.contentType,
      "Content-Length": String(bytes.length),
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(row.fileName)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
