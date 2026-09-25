# Multi-tenancy with Better Auth organizations, one organization per user

The app serves many businesses from one deployment. Each business is an **organization**; its members, cars and interval types belong to it, and every query is scoped by it.

We use Better Auth's organization plugin for organizations, members and invitations instead of our own tables, because it already provides invitations, member management and per-role access control, and it sits next to the auth tables we already use. Its default roles (owner/admin/member) are replaced by our own three roles through its access control: **admin**, **driver** and **viewer**.

A user belongs to **exactly one** organization. The plugin allows several; we refuse a second membership in its hooks and set the session's active organization automatically on sign-in, so there is no organization switcher. This keeps every screen and permission check about one organization and matches how fleets work: a driver works for one company.

Organizations are created by a platform **operator**, not by public sign-up. The operator is a platform-level role on the user, separate from any membership, and sees no fleet data.

## Considered options

- Own organization/membership tables: more control, but re-implements invitations and access control.
- One deployment per business: simpler data model, but every business would need its own hosting.
