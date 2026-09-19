CREATE TABLE "mileage_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"car_id" uuid NOT NULL,
	"odometer" integer NOT NULL,
	"recorded_at" date NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mileage_entry" ADD CONSTRAINT "mileage_entry_car_id_car_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."car"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mileage_entry_car_id_idx" ON "mileage_entry" USING btree ("car_id");