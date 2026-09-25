CREATE TYPE "public"."contract_kind" AS ENUM('owned', 'leased', 'financed', 'rented');--> statement-breakpoint
CREATE TYPE "public"."included_service" AS ENUM('maintenance', 'tyres', 'insurance', 'vehicle_tax');--> statement-breakpoint
CREATE TABLE "contract" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"car_id" uuid NOT NULL,
	"kind" "contract_kind" NOT NULL,
	"counterparty" text,
	"contract_number" text,
	"start_on" date,
	"term_months" integer,
	"end_on" date,
	"monthly_rate_cents" integer,
	"down_payment_cents" integer,
	"balloon_payment_cents" integer,
	"purchased_on" date,
	"purchase_price_cents" integer,
	"included_services" "included_service"[] DEFAULT '{}' NOT NULL,
	"included_other" text,
	"end_alert_months" integer DEFAULT 6 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "contract_car_id_unique" UNIQUE("car_id")
);
--> statement-breakpoint
ALTER TABLE "attachment" ADD COLUMN "contract_id" uuid;--> statement-breakpoint
ALTER TABLE "contract" ADD CONSTRAINT "contract_car_id_car_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."car"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_contract_id_contract_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contract"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attachment_contract_id_idx" ON "attachment" USING btree ("contract_id");