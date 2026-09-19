CREATE TYPE "public"."unit" AS ENUM('km', 'mi');--> statement-breakpoint
CREATE TABLE "car" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"unit" "unit" DEFAULT 'km' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "car" ADD CONSTRAINT "car_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "car_user_id_idx" ON "car" USING btree ("user_id");