CREATE TABLE "user_preference" (
	"user_id" text PRIMARY KEY NOT NULL,
	"default_car_id" uuid
);
--> statement-breakpoint
ALTER TABLE "user_preference" ADD CONSTRAINT "user_preference_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preference" ADD CONSTRAINT "user_preference_default_car_id_car_id_fk" FOREIGN KEY ("default_car_id") REFERENCES "public"."car"("id") ON DELETE set null ON UPDATE no action;