import {
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { organization } from "./auth-schema.ts";

export const car = pgTable(
  "car",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    photoContentType: text("photo_content_type"),
    photoUpdatedAt: timestamp("photo_updated_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("car_organization_id_idx").on(table.organizationId)],
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
export type MileageEntry = typeof mileageEntry.$inferSelect;
