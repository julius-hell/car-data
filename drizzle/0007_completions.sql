CREATE TYPE "public"."completion_result" AS ENUM('passed', 'minor_defects', 'major_defects');--> statement-breakpoint
CREATE TABLE "attachment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"car_id" uuid,
	"user_id" text,
	"completion_id" uuid,
	"file_name" text NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"uploaded_by" text,
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
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_car_id_car_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."car"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_completion_id_completion_id_fk" FOREIGN KEY ("completion_id") REFERENCES "public"."completion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "completion" ADD CONSTRAINT "completion_interval_id_interval_id_fk" FOREIGN KEY ("interval_id") REFERENCES "public"."interval"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "completion" ADD CONSTRAINT "completion_mileage_entry_id_mileage_entry_id_fk" FOREIGN KEY ("mileage_entry_id") REFERENCES "public"."mileage_entry"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "completion" ADD CONSTRAINT "completion_recorded_by_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attachment_completion_id_idx" ON "attachment" USING btree ("completion_id");--> statement-breakpoint
CREATE INDEX "attachment_car_id_idx" ON "attachment" USING btree ("car_id");--> statement-breakpoint
CREATE INDEX "completion_interval_id_idx" ON "completion" USING btree ("interval_id");