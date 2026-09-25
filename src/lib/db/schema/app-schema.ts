import {
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { organization } from "./auth-schema.ts";

export const retirementReasonEnum = pgEnum("retirement_reason", ["sold", "returned", "scrapped", "other"]);

export const car = pgTable(
  "car",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    // Normalised (see normalizeLicencePlate); the label cars go by everywhere.
    licencePlate: text("licence_plate").notNull(),
    make: text("make").notNull(),
    model: text("model").notNull(),
    vin: text("vin"),
    firstRegistration: date("first_registration"),
    costCenter: text("cost_center"),
    location: text("location"),
    retiredOn: date("retired_on"),
    retirementReason: retirementReasonEnum("retirement_reason"),
    photoContentType: text("photo_content_type"),
    photoUpdatedAt: timestamp("photo_updated_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("car_organization_id_idx").on(table.organizationId),
    uniqueIndex("car_organization_plate_unique").on(table.organizationId, table.licencePlate),
  ],
);

export const mileageEntry = pgTable(
  "mileage_entry",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    carId: uuid("car_id")
      .notNull()
      .references(() => car.id, { onDelete: "cascade" }),
    odometer: integer("odometer").notNull(),
    recordedAt: date("recorded_at").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("mileage_entry_car_id_idx").on(table.carId)],
);

export type Car = typeof car.$inferSelect;
export type RetirementReason = NonNullable<Car["retirementReason"]>;
export const RETIREMENT_REASONS = retirementReasonEnum.enumValues;
export type MileageEntry = typeof mileageEntry.$inferSelect;
