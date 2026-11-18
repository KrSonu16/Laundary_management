CREATE TABLE "app_settings" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"staff_id" varchar(36),
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"details" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"mobile" varchar(15) NOT NULL,
	"alternate_mobile" varchar(15),
	"address" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "garment_types" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"hindi_name" text NOT NULL,
	"english_name" text NOT NULL,
	"category" text DEFAULT 'General' NOT NULL,
	"icon_name" text DEFAULT 'Shirt' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"order_id" varchar(36) NOT NULL,
	"customer_id" varchar(36),
	"recipient_mobile" text NOT NULL,
	"channel" varchar(20) DEFAULT 'WHATSAPP' NOT NULL,
	"template_name" text DEFAULT 'order_ready_hi',
	"message_body" text NOT NULL,
	"status" varchar(20) DEFAULT 'SENT' NOT NULL,
	"provider_message_id" text,
	"error_message" text,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_garments" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"order_id" varchar(36) NOT NULL,
	"garment_type_id" varchar(36),
	"hindi_name" text NOT NULL,
	"english_name" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"order_number" text NOT NULL,
	"customer_id" varchar(36) NOT NULL,
	"slip_number" text,
	"slip_image_url" text,
	"status" varchar(30) DEFAULT 'RECEIVED' NOT NULL,
	"expected_quantity" integer DEFAULT 0 NOT NULL,
	"actual_quantity" integer,
	"is_quantity_verified" boolean DEFAULT false NOT NULL,
	"verified_by_staff_id" varchar(36),
	"verified_at" timestamp with time zone,
	"received_date" timestamp with time zone DEFAULT now() NOT NULL,
	"expected_delivery_date" timestamp with time zone NOT NULL,
	"delivered_at" timestamp with time zone,
	"delivered_by_staff_id" varchar(36),
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"created_by_staff_id" varchar(36),
	"special_instructions" text,
	"duplicate_receipt_count" integer DEFAULT 0 NOT NULL,
	"last_receipt_printed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "qr_codes" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"order_id" varchar(36) NOT NULL,
	"token_hash" text NOT NULL,
	"token_display_prefix" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"generated_by_staff_id" varchar(36),
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"invalidated_at" timestamp with time zone,
	"invalidation_reason" text,
	"regeneration_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "qr_codes_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "quantity_corrections" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"order_id" varchar(36) NOT NULL,
	"previous_expected_quantity" integer NOT NULL,
	"new_expected_quantity" integer NOT NULL,
	"reason" text NOT NULL,
	"authorized_by_staff_id" varchar(36) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scan_history" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"order_id" varchar(36) NOT NULL,
	"qr_code_id" varchar(36),
	"scanned_by_staff_id" varchar(36),
	"scan_result" varchar(40) NOT NULL,
	"message" text NOT NULL,
	"device_info" text,
	"scanned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_sessions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"staff_user_id" varchar(36) NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "staff_users" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"mobile" varchar(15) NOT NULL,
	"role" varchar(20) DEFAULT 'SHOPKEEPER' NOT NULL,
	"password_hash" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_garments" ADD CONSTRAINT "order_garments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_garments" ADD CONSTRAINT "order_garments_garment_type_id_garment_types_id_fk" FOREIGN KEY ("garment_type_id") REFERENCES "public"."garment_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quantity_corrections" ADD CONSTRAINT "quantity_corrections_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_history" ADD CONSTRAINT "scan_history_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_history" ADD CONSTRAINT "scan_history_qr_code_id_qr_codes_id_fk" FOREIGN KEY ("qr_code_id") REFERENCES "public"."qr_codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_sessions" ADD CONSTRAINT "staff_sessions_staff_user_id_staff_users_id_fk" FOREIGN KEY ("staff_user_id") REFERENCES "public"."staff_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_entity" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_audit_created_at" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_customer_mobile" ON "customers" USING btree ("mobile");--> statement-breakpoint
CREATE INDEX "idx_customer_name" ON "customers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_garment_active" ON "garment_types" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_notifications_order" ON "notifications" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_sent_at" ON "notifications" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX "idx_order_garments_order" ON "order_garments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_order_number" ON "orders" USING btree ("order_number");--> statement-breakpoint
CREATE INDEX "idx_order_customer" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_order_status" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_order_delivery_date" ON "orders" USING btree ("expected_delivery_date");--> statement-breakpoint
CREATE INDEX "idx_order_slip_number" ON "orders" USING btree ("slip_number");--> statement-breakpoint
CREATE INDEX "idx_qr_token_hash" ON "qr_codes" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_qr_order_id" ON "qr_codes" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_qr_active" ON "qr_codes" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_corrections_order" ON "quantity_corrections" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_scan_order_id" ON "scan_history" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_scan_scanned_at" ON "scan_history" USING btree ("scanned_at");--> statement-breakpoint
CREATE INDEX "idx_staff_sessions_user" ON "staff_sessions" USING btree ("staff_user_id");--> statement-breakpoint
CREATE INDEX "idx_staff_sessions_expiry" ON "staff_sessions" USING btree ("expires_at");