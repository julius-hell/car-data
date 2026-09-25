# Fresh baseline migration instead of migrating personal data

Turning the personal mileage tracker into a multi-tenant fleet manager moves cars from users to organizations, replaces passkeys with passwords and adds a different domain. The only existing data is a handful of personal cars and readings.

We start fresh: the migration history is replaced by a new baseline when organizations are introduced, and existing deployments recreate their database. Writing and testing a data migration from user-owned cars to organizations would cost more than re-entering the data, and it would keep legacy shapes alive in the schema.
