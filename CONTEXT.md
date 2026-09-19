# Car Data — domain context

A self-hosted web app where a person records the odometer readings of the cars they own and watches how the mileage develops over time.

## Glossary

- **User** — a person with an account. Identified only by a display name and a passkey; there are no passwords.
- **Passkey** — the WebAuthn credential a user signs up and signs in with. It is the user's only credential.
- **Car** — a vehicle owned by exactly one user. Has a name and a unit. A user may own any number of cars.
- **Unit** — the distance unit a car's readings are recorded in: `km` or `mi`. Set per car, defaults to `km`.
- **Mileage entry** — one odometer reading for one car: the reading, the date it was taken (*recorded-at*), and an optional note. Entries are the only data the app collects.
- **Odometer reading** — the whole-number distance shown on the car's odometer, in the car's unit.
- **Default car** — the car the app opens on after sign-in and whenever the app root is visited. Each user has at most one; the first car a user creates becomes it automatically.
- **Landing** — where the app root sends a signed-in user: the default car's page if set, otherwise the car list.

## Terms to avoid

- "vehicle" — say *car*.
- "trip", "log", "record" — say *mileage entry*.
- "miles"/"kilometres" as a field — say *odometer reading* plus the car's *unit*.
- "favourite"/"primary" car — say *default car*.
