CREATE TABLE "hrp_holiday_configs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"contractId" varchar(36) NOT NULL,
	"date" date NOT NULL,
	"strategy" varchar(50) DEFAULT 'off' NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrp_payroll_hourly_forecasts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"contractId" varchar(36) NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"forecasted_hours" numeric(10, 2) DEFAULT '0.00'
);
--> statement-breakpoint
ALTER TABLE "hrp_holiday_configs" ADD CONSTRAINT "hrp_holiday_configs_contractId_hrp_contracts_id_fk" FOREIGN KEY ("contractId") REFERENCES "public"."hrp_contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrp_payroll_hourly_forecasts" ADD CONSTRAINT "hrp_payroll_hourly_forecasts_contractId_hrp_contracts_id_fk" FOREIGN KEY ("contractId") REFERENCES "public"."hrp_contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "holiday_config_idx" ON "hrp_holiday_configs" USING btree ("contractId","date");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_hourly_forecast_idx" ON "hrp_payroll_hourly_forecasts" USING btree ("contractId","year","month");