CREATE TYPE "public"."built_in_interval" AS ENUM('hu', 'uvv_inspection', 'service', 'licence_check', 'uvv_instruction');--> statement-breakpoint
CREATE TYPE "public"."due_precision" AS ENUM('month', 'day');--> statement-breakpoint
CREATE TYPE "public"."interval_subject" AS ENUM('car', 'driver');--> statement-breakpoint
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
ALTER TABLE "interval" ADD CONSTRAINT "interval_interval_type_id_interval_type_id_fk" FOREIGN KEY ("interval_type_id") REFERENCES "public"."interval_type"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interval" ADD CONSTRAINT "interval_car_id_car_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."car"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interval" ADD CONSTRAINT "interval_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interval_type" ADD CONSTRAINT "interval_type_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "interval_type_car_unique" ON "interval" USING btree ("interval_type_id","car_id");--> statement-breakpoint
CREATE UNIQUE INDEX "interval_type_user_unique" ON "interval" USING btree ("interval_type_id","user_id");--> statement-breakpoint
CREATE INDEX "interval_car_id_idx" ON "interval" USING btree ("car_id");--> statement-breakpoint
CREATE INDEX "interval_user_id_idx" ON "interval" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "interval_type_organization_id_idx" ON "interval_type" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "interval_type_built_in_unique" ON "interval_type" USING btree ("organization_id","built_in");