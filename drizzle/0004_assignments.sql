CREATE TABLE "assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"car_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_car_id_car_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."car"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assignment_car_id_idx" ON "assignment" USING btree ("car_id");--> statement-breakpoint
CREATE INDEX "assignment_user_id_idx" ON "assignment" USING btree ("user_id");