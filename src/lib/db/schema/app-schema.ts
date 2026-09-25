import {
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  boolean,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { organization, user } from "./auth-schema.ts";

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
    // Who recorded it; the name is kept so it survives the account.
    recordedBy: text("recorded_by").references(() => user.id, { onDelete: "set null" }),
    recordedByName: text("recorded_by_name"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("mileage_entry_car_id_idx").on(table.carId)],
);

export type Car = typeof car.$inferSelect;
export type RetirementReason = NonNullable<Car["retirementReason"]>;
export const RETIREMENT_REASONS = retirementReasonEnum.enumValues;
export type MileageEntry = typeof mileageEntry.$inferSelect;

// Who drives which car when. Several people can drive one car at once; an
// assignment is current from startsOn up to and including endsOn.
export const assignment = pgTable(
  "assignment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    carId: uuid("car_id")
      .notNull()
      .references(() => car.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("assignment_car_id_idx").on(table.carId),
    index("assignment_user_id_idx").on(table.userId),
  ],
);

export type Assignment = typeof assignment.$inferSelect;

export const builtInIntervalEnum = pgEnum("built_in_interval", [
  "hu",
  "uvv_inspection",
  "service",
  "licence_check",
  "uvv_instruction",
]);
export const intervalSubjectEnum = pgEnum("interval_subject", ["car", "driver"]);
export const duePrecisionEnum = pgEnum("due_precision", ["month", "day"]);

// A kind of recurring obligation. Each organization gets the built-in types
// and may add its own.
export const intervalType = pgTable(
  "interval_type",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    builtIn: builtInIntervalEnum("built_in"),
    // Custom types only; built-in names come from the translations.
    name: text("name"),
    subject: intervalSubjectEnum("subject").notNull(),
    periodMonths: integer("period_months").notNull(),
    periodKm: integer("period_km"),
    precision: duePrecisionEnum("precision").default("day").notNull(),
    dueSoonDays: integer("due_soon_days").default(30).notNull(),
    dueSoonKm: integer("due_soon_km"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("interval_type_organization_id_idx").on(table.organizationId),
    uniqueIndex("interval_type_built_in_unique").on(table.organizationId, table.builtIn),
  ],
);

// One interval type tracked for one car or one driver.
export const interval = pgTable(
  "interval",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    intervalTypeId: uuid("interval_type_id")
      .notNull()
      .references(() => intervalType.id, { onDelete: "cascade" }),
    carId: uuid("car_id").references(() => car.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    // Overrides of the type's period for this car.
    periodMonths: integer("period_months"),
    periodKm: integer("period_km"),
    // For month precision, the first day of the due month.
    nextDueOn: date("next_due_on"),
    nextDueOdometer: integer("next_due_odometer"),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("interval_type_car_unique").on(table.intervalTypeId, table.carId),
    uniqueIndex("interval_type_user_unique").on(table.intervalTypeId, table.userId),
    index("interval_car_id_idx").on(table.carId),
    index("interval_user_id_idx").on(table.userId),
  ],
);

export type IntervalType = typeof intervalType.$inferSelect;
export type Interval = typeof interval.$inferSelect;
export type BuiltInInterval = NonNullable<IntervalType["builtIn"]>;

export const contractKindEnum = pgEnum("contract_kind", ["owned", "leased", "financed", "rented"]);
export const includedServiceEnum = pgEnum("included_service", ["maintenance", "tyres", "insurance", "vehicle_tax"]);

// How a car is held. One per car; changing the kind replaces the details.
export const contract = pgTable("contract", {
  id: uuid("id").primaryKey().defaultRandom(),
  carId: uuid("car_id")
    .notNull()
    .unique()
    .references(() => car.id, { onDelete: "cascade" }),
  kind: contractKindEnum("kind").notNull(),
  // Lessor, lender or rental provider.
  counterparty: text("counterparty"),
  contractNumber: text("contract_number"),
  startOn: date("start_on"),
  termMonths: integer("term_months"),
  // Entered for rentals; derived from start and term for leasing and financing.
  endOn: date("end_on"),
  monthlyRateCents: integer("monthly_rate_cents"),
  downPaymentCents: integer("down_payment_cents"),
  balloonPaymentCents: integer("balloon_payment_cents"),
  purchasedOn: date("purchased_on"),
  purchasePriceCents: integer("purchase_price_cents"),
  includedServices: includedServiceEnum("included_services").array().default([]).notNull(),
  includedOther: text("included_other"),
  // How many months before the end the contract shows as ending soon.
  endAlertMonths: integer("end_alert_months").default(6).notNull(),
  // Mileage allowance of leased and rented cars. Per-km rates are stored in
  // ten-thousandths of a euro, so €0.085 is 850.
  kmPerYear: integer("km_per_year"),
  handoverOdometer: integer("handover_odometer"),
  excessKmRate: integer("excess_km_rate"),
  underKmRate: integer("under_km_rate"),
  // The handover at the end of a lease or rental.
  returnedOn: date("returned_on"),
  returnOdometer: integer("return_odometer"),
  returnNotes: text("return_notes"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const completionResultEnum = pgEnum("completion_result", ["passed", "minor_defects", "major_defects"]);

// The record of fulfilling an interval.
export const completion = pgTable(
  "completion",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    intervalId: uuid("interval_id")
      .notNull()
      .references(() => interval.id, { onDelete: "cascade" }),
    completedOn: date("completed_on").notNull(),
    odometer: integer("odometer"),
    result: completionResultEnum("result"),
    provider: text("provider"),
    costCents: integer("cost_cents"),
    note: text("note"),
    // Licence checks only.
    licenceClasses: text("licence_classes"),
    licenceExpiresOn: date("licence_expires_on"),
    // The mileage entry created from the odometer, removed with the completion.
    mileageEntryId: uuid("mileage_entry_id").references(() => mileageEntry.id, { onDelete: "set null" }),
    // The interval's due date and odometer before this completion, restored
    // when it is deleted.
    previousDueOn: date("previous_due_on"),
    previousDueOdometer: integer("previous_due_odometer"),
    recordedBy: text("recorded_by").references(() => user.id, { onDelete: "set null" }),
    recordedByName: text("recorded_by_name"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("completion_interval_id_idx").on(table.intervalId)],
);

// A stored file. It belongs to exactly one record (one of the owner columns)
// and lives on disk under its car or user.
export const attachment = pgTable(
  "attachment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    carId: uuid("car_id").references(() => car.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    completionId: uuid("completion_id").references(() => completion.id, { onDelete: "cascade" }),
    contractId: uuid("contract_id").references(() => contract.id, { onDelete: "cascade" }),
    // Condition photos taken when a leased or rented car was returned.
    returnOfContractId: uuid("return_of_contract_id").references(() => contract.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(),
    uploadedBy: text("uploaded_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("attachment_completion_id_idx").on(table.completionId),
    index("attachment_car_id_idx").on(table.carId),
    index("attachment_contract_id_idx").on(table.contractId),
  ],
);

export type Completion = typeof completion.$inferSelect;
export type CompletionResult = NonNullable<Completion["result"]>;
export const COMPLETION_RESULTS = completionResultEnum.enumValues;
export type Attachment = typeof attachment.$inferSelect;

export type Contract = typeof contract.$inferSelect;
export type ContractKind = Contract["kind"];
export const CONTRACT_KINDS = contractKindEnum.enumValues;
export type IncludedService = Contract["includedServices"][number];
export const INCLUDED_SERVICES = includedServiceEnum.enumValues;
