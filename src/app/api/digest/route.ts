import { timingSafeEqual } from "node:crypto";
import { sendDigests } from "@/lib/digest";

function authorized(request: Request) {
  const secret = process.env.DIGEST_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret || !header.startsWith("Bearer ")) return false;
  const given = Buffer.from(header.slice("Bearer ".length));
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// Called by the scheduler every Monday morning (see docker-compose.yml).
export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const sent = await sendDigests();
  return Response.json({ sent });
}
