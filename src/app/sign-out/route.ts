import { auth } from "@/lib/auth";
import { safeNextPath } from "@/lib/next-path";

// A plain form POST (no JavaScript needed) that ends the session and sends
// the browser on with a fresh request, so the next page renders signed out.
export async function POST(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") return new Response(null, { status: 403 });

  const signedOut = await auth.api.signOut({ headers: request.headers, asResponse: true });
  const form = await request.formData().catch(() => null);
  const next = safeNextPath(form?.get("next")) ?? "/login";
  const response = new Response(null, { status: 303, headers: { Location: next } });
  for (const cookie of signedOut.headers.getSetCookie()) response.headers.append("Set-Cookie", cookie);
  return response;
}
