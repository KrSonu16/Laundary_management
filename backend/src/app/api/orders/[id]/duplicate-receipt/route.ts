import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  orders,
  orderGarments,
  customers,
  qrCodes,
  appSettings,
  auditLogs,
} from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { getCurrentUser, isAuthorized } from "@/lib/auth";
import { generateQrDataUrl } from "@/lib/crypto";
import crypto from "crypto";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!isAuthorized(currentUser, ["ADMIN", "SHOPKEEPER"])) {
      return NextResponse.json({ error: "Shopkeeper or owner access required" }, { status: 403 });
    }

    const { id } = await params;

    const [order] = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        customerId: orders.customerId,
        customerName: customers.name,
        customerMobile: customers.mobile,
        customerAddress: customers.address,
        slipNumber: orders.slipNumber,
        status: orders.status,
        expectedQuantity: orders.expectedQuantity,
        receivedDate: orders.receivedDate,
        expectedDeliveryDate: orders.expectedDeliveryDate,
        duplicateReceiptCount: orders.duplicateReceiptCount,
      })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(eq(orders.id, id))
      .limit(1);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Increment duplicate receipt count
    const newCount = (order.duplicateReceiptCount || 0) + 1;
    await db
      .update(orders)
      .set({
        duplicateReceiptCount: newCount,
        lastReceiptPrintedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id));

    // Garments list
    const garments = await db
      .select()
      .from(orderGarments)
      .where(eq(orderGarments.orderId, id));

    // Active QR code if generated
    const [activeQr] = await db
      .select()
      .from(qrCodes)
      .where(eq(qrCodes.orderId, id))
      .orderBy(desc(qrCodes.generatedAt))
      .limit(1);

    let qrDataUrl: string | null = null;
    let qrPrefix: string | null = null;
    if (activeQr && activeQr.isActive) {
      qrPrefix = activeQr.tokenDisplayPrefix;
      qrDataUrl = await generateQrDataUrl(
        `DCSMART:${order.orderNumber}:${activeQr.tokenDisplayPrefix}`
      );
    }

    // Shop settings
    const settingsRows = await db.select().from(appSettings);
    const settingsMap = new Map(settingsRows.map((s) => [s.key, s.value]));

    const shopDetails = {
      shopName: settingsMap.get("SHOP_NAME") || "DC Smart Laundry",
      shopTagline: settingsMap.get("SHOP_TAGLINE") || "प्रीमियम ड्राई-क्लीनिंग और लॉन्ड्री सेवा",
      shopPhone: settingsMap.get("SHOP_PHONE") || "0124-4200100 / +91 98765 00000",
      shopAddress:
        settingsMap.get("SHOP_ADDRESS") ||
        "Shop No. 12, Main Market, Sector 14, Near City Plaza, Gurugram, Haryana - 122001",
    };

    if (currentUser) {
      await db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        staffId: currentUser.id,
        action: "DUPLICATE_RECEIPT_PRINTED",
        entityType: "ORDER",
        entityId: id,
        details: `Duplicate receipt #${newCount} generated for order ${order.orderNumber} by ${currentUser.name}`,
      });
    }

    return NextResponse.json({
      success: true,
      receipt: {
        isDuplicateCopy: true,
        duplicateCopyNumber: newCount,
        printedAt: new Date().toISOString(),
        printedBy: currentUser?.name || "Staff",
        shop: shopDetails,
        orderNumber: order.orderNumber,
        slipNumber: order.slipNumber,
        customerName: order.customerName,
        customerMobile: order.customerMobile,
        customerAddress: order.customerAddress,
        receivedDate: order.receivedDate.toISOString(),
        expectedDeliveryDate: order.expectedDeliveryDate.toISOString(),
        status: order.status,
        expectedQuantity: order.expectedQuantity,
        garments,
        qrPrefix,
        qrDataUrl,
      },
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Failed to generate receipt";
    return NextResponse.json({ error }, { status: 500 });
  }
}
