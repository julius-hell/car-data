ALTER TABLE "attachment" ADD COLUMN "return_of_contract_id" uuid;--> statement-breakpoint
ALTER TABLE "contract" ADD COLUMN "km_per_year" integer;--> statement-breakpoint
ALTER TABLE "contract" ADD COLUMN "handover_odometer" integer;--> statement-breakpoint
ALTER TABLE "contract" ADD COLUMN "excess_km_rate" integer;--> statement-breakpoint
ALTER TABLE "contract" ADD COLUMN "under_km_rate" integer;--> statement-breakpoint
ALTER TABLE "contract" ADD COLUMN "returned_on" date;--> statement-breakpoint
ALTER TABLE "contract" ADD COLUMN "return_odometer" integer;--> statement-breakpoint
ALTER TABLE "contract" ADD COLUMN "return_notes" text;--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_return_of_contract_id_contract_id_fk" FOREIGN KEY ("return_of_contract_id") REFERENCES "public"."contract"("id") ON DELETE cascade ON UPDATE no action;