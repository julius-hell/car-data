CREATE TYPE "public"."damage_status" AS ENUM('open', 'resolved');--> statement-breakpoint
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
ALTER TABLE "attachment" ADD COLUMN "damage_report_id" uuid;--> statement-breakpoint
ALTER TABLE "damage_report" ADD CONSTRAINT "damage_report_car_id_car_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."car"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "damage_report" ADD CONSTRAINT "damage_report_reported_by_user_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "damage_report" ADD CONSTRAINT "damage_report_resolved_by_user_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "damage_report_car_id_idx" ON "damage_report" USING btree ("car_id");--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_damage_report_id_damage_report_id_fk" FOREIGN KEY ("damage_report_id") REFERENCES "public"."damage_report"("id") ON DELETE cascade ON UPDATE no action;