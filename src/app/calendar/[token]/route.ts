import { calendarFeed } from "@/lib/calendar";

// A member's subscribable calendar. The token in the URL is the only
// credential, so calendar apps can fetch it without signing in.
export async function GET(_request: Request, context: RouteContext<"/calendar/[token]">) {
  const { token } = await context.params;
  const feed = await calendarFeed(token);
  if (!feed) return new Response(null, { status: 404 });
  return new Response(feed, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="car-data.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
