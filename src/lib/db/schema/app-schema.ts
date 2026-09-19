import {
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const unitEnum = pgEnum("unit", ["km", "mi"]);

export const car = pgTable(
  "car",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    unit: unitEnum("unit").notNull().default("km"),
    photoContentType: text("photo_content_type"),
    photoUpdatedAt: timestamp("photo_updated_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("car_user_id_idx").on(table.userId)],
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

export const userPreference = pgTable("user_preference", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  defaultCarId: uuid("default_car_id").references(() => car.id, {
    onDelete: "set null",
  }),
});

export type Car = typeof car.$inferSelect;
export type Unit = Car["unit"];
export const UNITS = unitEnum.enumValues;
export type MileageEntry = typeof mileageEntry.$inferSelect;
