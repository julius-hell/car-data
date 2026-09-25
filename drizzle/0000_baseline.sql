CREATE TYPE "public"."built_in_interval" AS ENUM('hu', 'uvv_inspection', 'service', 'licence_check', 'uvv_instruction');--> statement-breakpoint
CREATE TYPE "public"."completion_result" AS ENUM('passed', 'minor_defects', 'major_defects');--> statement-breakpoint
CREATE TYPE "public"."contract_kind" AS ENUM('owned', 'leased', 'financed', 'rented');--> statement-breakpoint
CREATE TYPE "public"."damage_status" AS ENUM('open', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."due_precision" AS ENUM('month', 'day');--> statement-breakpoint
CREATE TYPE "public"."included_service" AS ENUM('maintenance', 'tyres', 'insurance', 'vehicle_tax');--> statement-breakpoint
CREATE TYPE "public"."interval_subject" AS ENUM('car', 'driver');--> statement-breakpoint
CREATE TYPE "public"."retirement_reason" AS ENUM('sold', 'returned', 'scrapped', 'other');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"inviter_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"metadata" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"active_organization_id" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"is_operator" boolean DEFAULT false NOT NULL,
	"locale" text,
	"digest_opt_in" boolean DEFAULT true NOT NULL,
	"calendar_token" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_calendar_token_unique" UNIQUE("calendar_token")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"car_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attachment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"car_id" uuid,
	"user_id" text,
	"completion_id" uuid,
	"contract_id" uuid,
	"return_of_contract_id" uuid,
	"damage_report_id" uuid,
	"file_name" text NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"uploaded_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "car" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"licence_plate" text NOT NULL,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"vin" text,
	"first_registration" date,
	"cost_center" text,
	"location" text,
	"retired_on" date,
	"retirement_reason" "retirement_reason",
	"photo_content_type" text,
	"photo_updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "completion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interval_id" uuid NOT NULL,
	"completed_on" date NOT NULL,
	"odometer" integer,
	"result" "completion_result",
	"provider" text,
	"cost_cents" integer,
	"note" text,
	"licence_classes" text,
	"licence_expires_on" date,
	"mileage_entry_id" uuid,
	"previous_due_on" date,
	"previous_due_odometer" integer,
	"recorded_by" text,
	"recorded_by_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contract" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"car_id" uuid NOT NULL,
	"kind" "contract_kind" NOT NULL,
	"counterparty" text,
	"contract_number" text,
	"start_on" date,
	"term_months" integer,
	"end_on" date,
	"monthly_rate_cents" integer,
	"down_payment_cents" integer,
	"balloon_payment_cents" integer,
	"purchased_on" date,
	"purchase_price_cents" integer,
	"included_services" "included_service"[] DEFAULT '{}' NOT NULL,
	"included_other" text,
	"end_alert_months" integer DEFAULT 6 NOT NULL,
	"km_per_year" integer,
	"handover_odometer" integer,
	"excess_km_rate" integer,
	"under_km_rate" integer,
	"returned_on" date,
	"return_odometer" integer,
	"return_notes" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "contract_car_id_unique" UNIQUE("car_id")
);
--> statement-breakpoint
CREATE TABLE "damage_report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"car_id" uuid NOT NULL,
	"occurred_on" date NOT NULL,
	"description" text NOT NULL,
	"status" "damage_status" DEFAULT 'open' NOT NULL,
	"reported_by" text,
	"reported_by_name" text NOT NULL,
	"resolved_by" text,
	"resolved_by_name" text,
	"resolved_at" timestamp,
	"resolution_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interval" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interval_type_id" uuid NOT NULL,
	"car_id" uuid,
	"user_id" text,
	"period_months" integer,
	"period_km" integer,
	"next_due_on" date,
	"next_due_odometer" integer,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interval_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"built_in" "built_in_interval",
	"name" text,
	"subject" interval_subject NOT NULL,
	"period_months" integer NOT NULL,
	"period_km" integer,
	"precision" "due_precision" DEFAULT 'day' NOT NULL,
	"due_soon_days" integer DEFAULT 30 NOT NULL,
	"due_soon_km" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mileage_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"car_id" uuid NOT NULL,
	"odometer" integer NOT NULL,
	"recorded_at" date NOT NULL,
	"note" text,
	"recorded_by" text,
	"recorded_by_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_car_id_car_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."car"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_car_id_car_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."car"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_completion_id_completion_id_fk" FOREIGN KEY ("completion_id") REFERENCES "public"."completion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_contract_id_contract_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contract"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_return_of_contract_id_contract_id_fk" FOREIGN KEY ("return_of_contract_id") REFERENCES "public"."contract"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_damage_report_id_damage_report_id_fk" FOREIGN KEY ("damage_report_id") REFERENCES "public"."damage_report"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "car" ADD CONSTRAINT "car_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "completion" ADD CONSTRAINT "completion_interval_id_interval_id_fk" FOREIGN KEY ("interval_id") REFERENCES "public"."interval"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "completion" ADD CONSTRAINT "completion_mileage_entry_id_mileage_entry_id_fk" FOREIGN KEY ("mileage_entry_id") REFERENCES "public"."mileage_entry"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "completion" ADD CONSTRAINT "completion_recorded_by_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract" ADD CONSTRAINT "contract_car_id_car_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."car"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "damage_report" ADD CONSTRAINT "damage_report_car_id_car_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."car"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "damage_report" ADD CONSTRAINT "damage_report_reported_by_user_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "damage_report" ADD CONSTRAINT "damage_report_resolved_by_user_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interval" ADD CONSTRAINT "interval_interval_type_id_interval_type_id_fk" FOREIGN KEY ("interval_type_id") REFERENCES "public"."interval_type"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interval" ADD CONSTRAINT "interval_car_id_car_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."car"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interval" ADD CONSTRAINT "interval_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interval_type" ADD CONSTRAINT "interval_type_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mileage_entry" ADD CONSTRAINT "mileage_entry_car_id_car_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."car"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mileage_entry" ADD CONSTRAINT "mileage_entry_recorded_by_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "invitation_organizationId_idx" ON "invitation" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "invitation_email_idx" ON "invitation" USING btree ("email");--> statement-breakpoint
CREATE INDEX "member_organizationId_idx" ON "member" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "member_userId_unique" ON "member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "assignment_car_id_idx" ON "assignment" USING btree ("car_id");--> statement-breakpoint
CREATE INDEX "assignment_user_id_idx" ON "assignment" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "attachment_completion_id_idx" ON "attachment" USING btree ("completion_id");--> statement-breakpoint
CREATE INDEX "attachment_car_id_idx" ON "attachment" USING btree ("car_id");--> statement-breakpoint
CREATE INDEX "attachment_contract_id_idx" ON "attachment" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "car_organization_id_idx" ON "car" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "car_organization_plate_unique" ON "car" USING btree ("organization_id","licence_plate");--> statement-breakpoint
CREATE INDEX "completion_interval_id_idx" ON "completion" USING btree ("interval_id");--> statement-breakpoint
CREATE INDEX "damage_report_car_id_idx" ON "damage_report" USING btree ("car_id");--> statement-breakpoint
CREATE UNIQUE INDEX "interval_type_car_unique" ON "interval" USING btree ("interval_type_id","car_id");--> statement-breakpoint
CREATE UNIQUE INDEX "interval_type_user_unique" ON "interval" USING btree ("interval_type_id","user_id");--> statement-breakpoint
CREATE INDEX "interval_car_id_idx" ON "interval" USING btree ("car_id");--> statement-breakpoint
CREATE INDEX "interval_user_id_idx" ON "interval" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "interval_type_organization_id_idx" ON "interval_type" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "interval_type_built_in_unique" ON "interval_type" USING btree ("organization_id","built_in");--> statement-breakpoint
CREATE INDEX "mileage_entry_car_id_idx" ON "mileage_entry" USING btree ("car_id");