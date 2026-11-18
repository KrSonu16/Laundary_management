import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

// 1. Staff Users
export const staffUsers = pgTable(
  "staff_users",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    mobile: varchar("mobile", { length: 15 }).notNull(),
    role: varchar("role", { length: 20 }).notNull().default("SHOPKEEPER"), // ADMIN, SHOPKEEPER, WORKSHOP
    passwordHash: text("password_hash").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    isTemporary: boolean("is_temporary").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const staffSessions = pgTable(
  "staff_sessions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    staffUserId: varchar("staff_user_id", { length: 36 })
      .notNull()
      .references(() => staffUsers.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_staff_sessions_user").on(table.staffUserId),
    index("idx_staff_sessions_expiry").on(table.expiresAt),
  ]
);

// 2. Customers
export const customers = pgTable(
  "customers",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: text("name").notNull(),
    mobile: varchar("mobile", { length: 15 }).notNull(),
    alternateMobile: varchar("alternate_mobile", { length: 15 }),
    address: text("address"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_customer_mobile").on(table.mobile),
    index("idx_customer_name").on(table.name),
  ]
);

// 3. Garment Types (Catalogue with Hindi & English names)
export const garmentTypes = pgTable(
  "garment_types",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    hindiName: text("hindi_name").notNull(),
    englishName: text("english_name").notNull(),
    category: text("category").notNull().default("General"), // Men, Women, Household, Winter, Traditional
    iconName: text("icon_name").notNull().default("Shirt"),
    isActive: boolean("is_active").notNull().default(true),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_garment_active").on(table.isActive),
  ]
);

// 4. Orders
export const orders = pgTable(
  "orders",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    orderNumber: text("order_number").notNull().unique(), // e.g. DC-2026-00101
    customerId: varchar("customer_id", { length: 36 }).notNull().references(() => customers.id),
    slipNumber: text("slip_number"), // Handwritten receipt/slip number
    slipImageUrl: text("slip_image_url"), // Photo of the handwritten slip
    status: varchar("status", { length: 30 }).notNull().default("RECEIVED"),
    // RECEIVED, PROCESSING, QUANTITY_PENDING, QR_GENERATED, READY, DELIVERED, CANCELLED
    expectedQuantity: integer("expected_quantity").notNull().default(0),
    actualQuantity: integer("actual_quantity"),
    isQuantityVerified: boolean("is_quantity_verified").notNull().default(false),
    verifiedByStaffId: varchar("verified_by_staff_id", { length: 36 }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    receivedDate: timestamp("received_date", { withTimezone: true }).notNull().defaultNow(),
    expectedDeliveryDate: timestamp("expected_delivery_date", { withTimezone: true }).notNull(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    deliveredByStaffId: varchar("delivered_by_staff_id", { length: 36 }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancellationReason: text("cancellation_reason"),
    createdByStaffId: varchar("created_by_staff_id", { length: 36 }),
    specialInstructions: text("special_instructions"),
    duplicateReceiptCount: integer("duplicate_receipt_count").notNull().default(0),
    lastReceiptPrintedAt: timestamp("last_receipt_printed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_order_number").on(table.orderNumber),
    index("idx_order_customer").on(table.customerId),
    index("idx_order_status").on(table.status),
    index("idx_order_delivery_date").on(table.expectedDeliveryDate),
    index("idx_order_slip_number").on(table.slipNumber),
  ]
);

// 5. Order Garment Line Items
export const orderGarments = pgTable(
  "order_garments",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    orderId: varchar("order_id", { length: 36 }).notNull().references(() => orders.id, { onDelete: "cascade" }),
    garmentTypeId: varchar("garment_type_id", { length: 36 }).references(() => garmentTypes.id),
    hindiName: text("hindi_name").notNull(),
    englishName: text("english_name").notNull(),
    quantity: integer("quantity").notNull().default(1),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_order_garments_order").on(table.orderId),
  ]
);

// 6. Order QR Codes (One active QR code per order)
export const qrCodes = pgTable(
  "qr_codes",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    orderId: varchar("order_id", { length: 36 }).notNull().references(() => orders.id),
    tokenHash: text("token_hash").notNull().unique(), // SHA-256 hash of random token
    rawToken: text("raw_token"), // Plain text token for printable QR generation
    tokenDisplayPrefix: text("token_display_prefix").notNull(), // e.g. DCQR-xxxx
    isActive: boolean("is_active").notNull().default(true),
    generatedByStaffId: varchar("generated_by_staff_id", { length: 36 }),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
    invalidatedAt: timestamp("invalidated_at", { withTimezone: true }),
    invalidationReason: text("invalidation_reason"),
    regenerationCount: integer("regeneration_count").notNull().default(0),
  },
  (table) => [
    index("idx_qr_token_hash").on(table.tokenHash),
    index("idx_qr_order_id").on(table.orderId),
    index("idx_qr_active").on(table.isActive),
  ]
);

// 7. QR Scan History
export const scanHistory = pgTable(
  "scan_history",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    orderId: varchar("order_id", { length: 36 }).notNull().references(() => orders.id),
    qrCodeId: varchar("qr_code_id", { length: 36 }).references(() => qrCodes.id),
    scannedByStaffId: varchar("scanned_by_staff_id", { length: 36 }),
    scanResult: varchar("scan_result", { length: 40 }).notNull(), // SUCCESS, ALREADY_READY, INVALID_TOKEN, EXPIRED_TOKEN, ORDER_CANCELLED
    message: text("message").notNull(),
    deviceInfo: text("device_info"),
    scannedAt: timestamp("scanned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_scan_order_id").on(table.orderId),
    index("idx_scan_scanned_at").on(table.scannedAt),
  ]
);

// 8. Notifications (WhatsApp Cloud API logs)
export const notifications = pgTable(
  "notifications",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    orderId: varchar("order_id", { length: 36 }).notNull().references(() => orders.id),
    customerId: varchar("customer_id", { length: 36 }).references(() => customers.id),
    recipientMobile: text("recipient_mobile").notNull(),
    channel: varchar("channel", { length: 20 }).notNull().default("WHATSAPP"),
    templateName: text("template_name").default("order_ready_hi"),
    messageBody: text("message_body").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("SENT"), // PENDING, SENT, FAILED, DELIVERED
    providerMessageId: text("provider_message_id"),
    errorMessage: text("error_message"),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_notifications_order").on(table.orderId),
    index("idx_notifications_sent_at").on(table.sentAt),
  ]
);

// 9. Exceptional Quantity Corrections (Authorized by Admin/Owner)
export const quantityCorrections = pgTable(
  "quantity_corrections",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    orderId: varchar("order_id", { length: 36 }).notNull().references(() => orders.id),
    previousExpectedQuantity: integer("previous_expected_quantity").notNull(),
    newExpectedQuantity: integer("new_expected_quantity").notNull(),
    reason: text("reason").notNull(),
    authorizedByStaffId: varchar("authorized_by_staff_id", { length: 36 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_corrections_order").on(table.orderId),
  ]
);

// 10. Audit Logs
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    staffId: varchar("staff_id", { length: 36 }),
    action: text("action").notNull(), // ORDER_CREATED, QUANTITY_VERIFIED, QR_GENERATED, QR_SCANNED, ORDER_DELIVERED, etc.
    entityType: text("entity_type").notNull(), // ORDER, CUSTOMER, GARMENT, STAFF, SETTINGS
    entityId: text("entity_id"),
    details: text("details"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_audit_entity").on(table.entityType, table.entityId),
    index("idx_audit_created_at").on(table.createdAt),
  ]
);

// 11. App Settings (Key-value store for WhatsApp configuration, Shop details, etc.)
export const appSettings = pgTable(
  "app_settings",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    key: text("key").notNull().unique(),
    value: text("value").notNull(),
    description: text("description"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  }
);
