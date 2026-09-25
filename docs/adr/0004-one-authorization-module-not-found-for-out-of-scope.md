# One authorization module; out-of-scope data answers "not found"

Tenant isolation and role permissions are the most important correctness property of the app, so they live in one place. A single authorization module turns the session into an **actor** (user, organization, role, currently assigned cars) and offers organization-scoped queries and permission checks. Every page, server action, route handler, file download, calendar feed and digest goes through it; nothing queries tenant data without an organization scope.

Anything outside the actor's scope — another organization's car, a car a driver is not assigned to, a completion a driver may not see — answers **"not found"**, never "forbidden", so the existence of other data is not revealed.

We rely on application-level scoping rather than Postgres row-level security; RLS can be added later as defence in depth.
