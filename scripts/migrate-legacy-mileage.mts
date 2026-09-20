// Copies the mileage entries of one car from the legacy Firebase app into the
// new app. Only mileage moves; the car itself must already exist here.
//
//   node --env-file=.env scripts/migrate-legacy-mileage.mts \
//     --legacy <firestore car id> --car <new car uuid> [--dry-run] [--tz Europe/Berlin]
//
// Firestore access uses Application Default Credentials: either set
// GOOGLE_APPLICATION_CREDENTIALS to a service-account key file for the
// legacy project, or run `gcloud auth application-default login` first.
// FIREBASE_PROJECT_ID selects the project (defaults to car-stats-2a408).

import { parseArgs } from "node:util";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { count, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { car, mileageEntry } from "../src/lib/db/schema/app-schema.ts";

const { values: args } = parseArgs({
  options: {
    legacy: { type: "string" },
    car: { type: "string" },
    "dry-run": { type: "boolean", default: false },
    tz: { type: "string", default: "Europe/Berlin" },
  },
});

if (!args.legacy || !args.car) {
  console.error("Usage: --legacy <firestore car id> --car <new car uuid> [--dry-run] [--tz <IANA zone>]");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set (run with --env-file=.env).");
  process.exit(1);
}

const dateInZone = new Intl.DateTimeFormat("en-CA", {
  timeZone: args.tz,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function toDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) return new Date(value);
  return null;
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

try {
  const [target] = await db.select().from(car).where(eq(car.id, args.car));
  if (!target) throw new Error(`No car with id ${args.car} in the new app.`);
  console.log(`Target: ${target.name} (${target.unit})`);

  initializeApp({
    credential: applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID ?? "car-stats-2a408",
  });
  const firestore = getFirestore();
  const legacyCar = await firestore
    .collection("cars")
    .doc(args.legacy)
    .get()
    .catch((error: Error) => {
      throw new Error(
        `Could not read Firestore: ${error.message}\n` +
          "Set GOOGLE_APPLICATION_CREDENTIALS to a service-account key for the legacy project, " +
          "or run `gcloud auth application-default login`.",
      );
    });
  if (!legacyCar.exists) throw new Error(`No legacy car with id ${args.legacy}.`);
  console.log(`Source: ${legacyCar.get("name") ?? args.legacy}`);

  const snapshot = await firestore
    .collection("cars")
    .doc(args.legacy)
    .collection("mileage")
    .orderBy("timestamp")
    .get();

  const existing = await db
    .select({ odometer: mileageEntry.odometer, recordedAt: mileageEntry.recordedAt })
    .from(mileageEntry)
    .where(eq(mileageEntry.carId, target.id));
  const seen = new Set(existing.map((e) => `${e.recordedAt}:${e.odometer}`));

  const rows: (typeof mileageEntry.$inferInsert)[] = [];
  let skipped = 0;
  let invalid = 0;
  for (const doc of snapshot.docs) {
    const takenAt = toDate(doc.get("timestamp"));
    const value = Number(doc.get("value"));
    if (!takenAt || !Number.isFinite(value)) {
      console.warn(`  skip ${doc.id}: unreadable timestamp or value`, doc.data());
      invalid++;
      continue;
    }
    const recordedAt = dateInZone.format(takenAt);
    const odometer = Math.round(value);
    const key = `${recordedAt}:${odometer}`;
    if (seen.has(key)) {
      skipped++;
      continue;
    }
    seen.add(key);
    rows.push({ carId: target.id, odometer, recordedAt, createdAt: takenAt });
  }

  console.log(
    `${snapshot.size} legacy entries: ${rows.length} to copy, ${skipped} already present, ${invalid} unreadable.`,
  );
  for (const row of rows) console.log(`  ${row.recordedAt}  ${row.odometer} ${target.unit}`);

  if (args["dry-run"]) {
    console.log("Dry run, nothing written.");
  } else if (rows.length > 0) {
    await db.transaction(async (tx) => {
      await tx.insert(mileageEntry).values(rows);
    });
    const [{ total }] = await db
      .select({ total: count() })
      .from(mileageEntry)
      .where(eq(mileageEntry.carId, target.id));
    console.log(`Copied ${rows.length} entries. ${target.name} now has ${total} readings.`);
  }
} finally {
  await pool.end();
}
