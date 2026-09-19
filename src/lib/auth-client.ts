import { passkeyClient } from "@better-auth/passkey/client";
import type { RequestContext } from "@better-fetch/fetch";
import { createAuthClient } from "better-auth/react";

// The passkey plugin keeps one challenge cookie for every ceremony, so two
// option requests in flight at once (autofill armed on mount plus a button
// click) can overwrite each other's challenge. Callers await whenPasskeyIdle()
// before starting a ceremony.
const inflightOptionRequests = new Set<RequestContext>();
const idleWaiters = new Set<() => void>();

function isPasskeyOptionsRequest(url: URL | string) {
  return String(url).includes("/passkey/generate-");
}

function settle(request: RequestContext) {
  inflightOptionRequests.delete(request);
  if (inflightOptionRequests.size === 0) {
    for (const resolve of idleWaiters) resolve();
    idleWaiters.clear();
  }
}

export function whenPasskeyIdle(): Promise<void> {
  if (inflightOptionRequests.size === 0) return Promise.resolve();
  return new Promise((resolve) => idleWaiters.add(resolve));
}

export const authClient = createAuthClient({
  plugins: [passkeyClient()],
  fetchOptions: {
    onRequest(context) {
      if (isPasskeyOptionsRequest(context.url)) inflightOptionRequests.add(context);
    },
    onResponse(context) {
      settle(context.request);
    },
    onError(context) {
      settle(context.request);
    },
  },
});
