# Car Data — domain context

A self-hosted fleet manager. Businesses keep their company cars roadworthy and compliant (HU/AU, UVV, service, driver checks), track how each car is held (owned, leased, financed, rented) and collect odometer readings from their drivers.

## Glossary

- **Operator** — runs the deployment. Creates organizations and hands over their first admin's invitation. Is not a member of any organization and sees no fleet data.
- **Organization** — a business using the app. Every car, member and interval type belongs to exactly one organization. Its status is *active* or *deactivated*.
- **User** — a person with an account, identified by email address and signing in with a password. Belongs to at most one organization.
- **Member** — a user's membership in their one organization, with a role.
- **Role** — what a member may do: *admin* (manages everything), *driver* (sees the cars assigned to them, logs mileage entries, reports damage) or *viewer* (sees the fleet read-only, but no driver checks).
- **Invitation** — an offer to join an organization with a role, for one email address. Can be emailed or copied as a link; expires after 7 days.
- **Car** — a car or van (up to 3.5 t) of an organization, known by its licence plate. A *retired* car has left the fleet but keeps its history.
- **Assignment** — a dated link between a car and a member who drives it. A car can have several current assignments.
- **Mileage entry** — one odometer reading for one car: the reading, the date it was taken (*recorded-at*), an optional note and who recorded it.
- **Odometer reading** — the whole-number distance shown on the car's odometer, always in km.
- **Interval type** — a kind of recurring obligation with a subject (car or driver) and a period in months, for cars optionally also in km. Built-in: HU/AU, UVV inspection, service, licence check, UVV instruction. Admins can add custom types.
- **Interval** — one interval type tracked for one car or one driver, with a next due date and/or due odometer.
- **Driver check** — an interval whose subject is a driver: the licence check and the UVV instruction.
- **Completion** — the record of fulfilling an interval: date, odometer, result, workshop or inspector, cost, note, attachments.
- **Due status** — how urgent an interval or other item is: *ok*, *due soon*, *overdue* or *due date missing*.
- **Due item** — anything with a due status shown on the dashboard, in the email digest or in the calendar feed.
- **Contract** — how a car is held (owned, leased, financed or rented) and on which terms.
- **Allowance projection** — the projected odometer at the end of a leased or rented car's contract against its mileage allowance.
- **Return** — the handover of a leased or rented car at contract end; recording it retires the car.
- **Damage report** — damage or a defect reported for a car, open until an admin resolves it.
- **Attachment** — a file belonging to a completion, contract, return or damage report.

## Terms to avoid

- "tenant", "company", "account" for an organization — say *organization*.
- "vehicle" — say *car* (vans included).
- "reminder" — say *interval*.
- "TÜV" as a type name (it is one testing organisation) — say *HU/AU*.
- "inspection" on its own — say *interval* for the obligation and *completion* for the record.
- "trip", "log", "record" for a reading — say *mileage entry*.
- "miles"/"kilometres" as a field — say *odometer reading*; the unit is always km.
