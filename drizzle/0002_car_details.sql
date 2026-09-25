CREATE TYPE "public"."retirement_reason" AS ENUM('sold', 'returned', 'scrapped', 'other');--> statement-breakpoint
ALTER TABLE "car" ALTER COLUMN "name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "car" ADD COLUMN "licence_plate" text NOT NULL;--> statement-breakpoint
ALTER TABLE "car" ADD COLUMN "make" text NOT NULL;--> statement-breakpoint
ALTER TABLE "car" ADD COLUMN "model" text NOT NULL;--> statement-breakpoint
ALTER TABLE "car" ADD COLUMN "vin" text;--> statement-breakpoint
ALTER TABLE "car" ADD COLUMN "first_registration" date;--> statement-breakpoint
ALTER TABLE "car" ADD COLUMN "cost_center" text;--> statement-breakpoint
ALTER TABLE "car" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "car" ADD COLUMN "retired_on" date;--> statement-breakpoint
ALTER TABLE "car" ADD COLUMN "retirement_reason" "retirement_reason";--> statement-breakpoint
CREATE UNIQUE INDEX "car_organization_plate_unique" ON "car" USING btree ("organization_id","licence_plate");