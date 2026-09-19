import { pgEnum, pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
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
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("car_user_id_idx").on(table.userId)],
);

export type Car = typeof car.$inferSelect;
export type Unit = Car["unit"];
export const UNITS = unitEnum.enumValues;
