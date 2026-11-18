import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  orders,
  customers,
  qrCodes,
  scanHistory,
  orderGarments,
  auditLogs,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { hashQrToken } from "@/lib/crypto";
import { sendOrderReadyWhatsAppNotification } from "@/lib/whatsapp";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    const body = await req.json();
    const { token, deviceInfo } = body;

    if (!token || !token.trim()) {
      return NextResponse.json(
        { error: "QR token is required / QR टोकन आवश्यक है" },
        { status: 400 }
      );
    }

    const cleanToken = token.trim();
    // Compute SHA-256 hash of token to compare with database
    const tokenHash = hashQrToken(cleanToken);

    // Look up active QR code
    const [qrRecord] = await db
      .select()
      .from(qrCodes)
      .where(eq(qrCodes.tokenHash, tokenHash))
      .limit(1);

    if (!qrRecord) {
      return NextResponse.json(
        {
          success: false,
          scanResult: "INVALID_TOKEN",
          message: "Invalid or unrecognized QR Code / अमान्य या अज्ञात QR कोड",
        },
        { status: 404 }
      );
    }

    if (!qrRecord.isActive) {
      // Inactive/replaced QR code
      const scanId = crypto.randomUUID();
      await db.insert(scanHistory).values({
        id: scanId,
        orderId: qrRecord.orderId,
        qrCodeId: qrRecord.id,
        scannedByStaffId: currentUser?.id || null,
        scanResult: "EXPIRED_TOKEN",
        message: `Scanned inactive QR: ${qrRecord.invalidationReason || "Old QR replaced"}`,
        deviceInfo: deviceInfo || null,
        scannedAt: new Date(),
      });

      return NextResponse.json(
        {
          success: false,
          scanResult: "EXPIRED_TOKEN",
          message: `This QR code has been replaced or invalidated (${qrRecord.invalidationReason || "Replacement generated"}). Please scan the new QR label.`,
        },
        { status: 410 }
      );
    }

    // Fetch order details
    const [order] = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        customerId: orders.customerId,
        customerName: customers.name,
        customerMobile: customers.mobile,
        status: orders.status,
        expectedQuantity: orders.expectedQuantity,
        actualQuantity: orders.actualQuantity,
        expectedDeliveryDate: orders.expectedDeliveryDate,
      })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(eq(orders.id, qrRecord.orderId))
      .limit(1);

    if (!order) {
      return NextResponse.json({ error: "Linked order not found" }, { status: 404 });
    }

    // Check order status constraints
    if (order.status === "CANCELLED") {
      await db.insert(scanHistory).values({
        id: crypto.randomUUID(),
        orderId: order.id,
        qrCodeId: qrRecord.id,
        scannedByStaffId: currentUser?.id || null,
        scanResult: "ORDER_CANCELLED",
        message: "Attempted to scan cancelled order",
        deviceInfo: deviceInfo || null,
        scannedAt: new Date(),
      });

      return NextResponse.json(
        {
          success: false,
          scanResult: "ORDER_CANCELLED",
          message: `Order ${order.orderNumber} was CANCELLED. Cannot process scan.`,
        },
        { status: 400 }
      );
    }

    if (order.status === "DELIVERED") {
      await db.insert(scanHistory).values({
        id: crypto.randomUUID(),
        orderId: order.id,
        qrCodeId: qrRecord.id,
        scannedByStaffId: currentUser?.id || null,
        scanResult: "ALREADY_DELIVERED",
        message: "Attempted to scan already delivered order",
        deviceInfo: deviceInfo || null,
        scannedAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        scanResult: "ALREADY_DELIVERED",
        message: `Order ${order.orderNumber} is already DELIVERED to ${order.customerName}.`,
        order,
      });
    }

    // Check for duplicate READY scan
    if (order.status === "READY") {
      await db.insert(scanHistory).values({
        id: crypto.randomUUID(),
        orderId: order.id,
        qrCodeId: qrRecord.id,
        scannedByStaffId: currentUser?.id || null,
        scanResult: "ALREADY_READY",
        message: "Order already scanned and ready previously. Duplicate scan prevented.",
        deviceInfo: deviceInfo || null,
        scannedAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        scanResult: "ALREADY_READY",
        message: `Order ${order.orderNumber} is already marked READY. Duplicate WhatsApp notification prevented.`,
        order,
      });
    }

    // VALID SCAN: Update order status to READY
    await db
      .update(orders)
      .set({
        status: "READY",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    // Log scan history
    await db.insert(scanHistory).values({
      id: crypto.randomUUID(),
      orderId: order.id,
      qrCodeId: qrRecord.id,
      scannedByStaffId: currentUser?.id || null,
      scanResult: "SUCCESS",
      message: `Successful QR scan by ${currentUser?.name || "Workshop Staff"}. Order marked READY.`,
      deviceInfo: deviceInfo || null,
      scannedAt: new Date(),
    });

    // Send WhatsApp customer notification
    const whatsappResult = await sendOrderReadyWhatsAppNotification({
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      customerName: order.customerName,
      customerMobile: order.customerMobile,
      totalGarments: order.expectedQuantity,
    });

    // Audit log
    if (currentUser) {
      await db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        staffId: currentUser.id,
        action: "ORDER_MARKED_READY_VIA_QR",
        entityType: "ORDER",
        entityId: order.id,
        details: `Order ${order.orderNumber} scanned and marked READY. WhatsApp notification status: ${whatsappResult.success ? "Sent" : "Failed (" + whatsappResult.error + ")"}`,
      });
    }

    return NextResponse.json({
      success: true,
      scanResult: "SUCCESS",
      message: `QR Scan Successful! Order ${order.orderNumber} is now READY for pickup.`,
      order: {
        ...order,
        status: "READY",
      },
      whatsappNotification: {
        sent: whatsappResult.success,
        recipient: order.customerMobile,
        messageId: whatsappResult.messageId,
        error: whatsappResult.error,
      },
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "QR Scan failed";
    return NextResponse.json({ error }, { status: 500 });
  }
}
