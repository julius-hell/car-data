ALTER TABLE "mileage_entry" ADD COLUMN "recorded_by" text;--> statement-breakpoint
ALTER TABLE "mileage_entry" ADD COLUMN "recorded_by_name" text;--> statement-breakpoint
ALTER TABLE "mileage_entry" ADD CONSTRAINT "mileage_entry_recorded_by_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;