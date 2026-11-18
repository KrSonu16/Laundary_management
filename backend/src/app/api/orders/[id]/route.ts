import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  orders,
  orderGarments,
  customers,
  qrCodes,
  scanHistory,
  notifications,
  staffUsers,
  auditLogs,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCurrentUser, isAuthorized } from "@/lib/auth";
import { generateQrDataUrl } from "@/lib/crypto";
import crypto from "crypto";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [order] = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        customerId: orders.customerId,
        customerName: customers.name,
        customerMobile: customers.mobile,
        customerAlternateMobile: customers.alternateMobile,
        customerAddress: customers.address,
        slipNumber: orders.slipNumber,
        slipImageUrl: orders.slipImageUrl,
        status: orders.status,
        expectedQuantity: orders.expectedQuantity,
        actualQuantity: orders.actualQuantity,
        isQuantityVerified: orders.isQuantityVerified,
        verifiedByStaffId: orders.verifiedByStaffId,
        verifiedAt: orders.verifiedAt,
        receivedDate: orders.receivedDate,
        expectedDeliveryDate: orders.expectedDeliveryDate,
        deliveredAt: orders.deliveredAt,
        deliveredByStaffId: orders.deliveredByStaffId,
        cancelledAt: orders.cancelledAt,
        cancellationReason: orders.cancellationReason,
        createdByStaffId: orders.createdByStaffId,
        specialInstructions: orders.specialInstructions,
        duplicateReceiptCount: orders.duplicateReceiptCount,
        lastReceiptPrintedAt: orders.lastReceiptPrintedAt,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(eq(orders.id, id))
      .limit(1);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Garments
    const garments = await db
      .select()
      .from(orderGarments)
      .where(eq(orderGarments.orderId, id));

    // Active QR code
    const [activeQr] = await db
      .select()
      .from(qrCodes)
      .where(eq(qrCodes.orderId, id))
      .orderBy(desc(qrCodes.generatedAt))
      .limit(1);

    let activeQrDetails = null;
    if (activeQr && activeQr.isActive) {
      // In production QR token is scanned. Use rawToken or prefix
      const qrPayload = activeQr.rawToken || activeQr.tokenDisplayPrefix;
      const qrDataUrl = await generateQrDataUrl(qrPayload);

      activeQrDetails = {
        id: activeQr.id,
        tokenDisplayPrefix: activeQr.tokenDisplayPrefix,
        rawToken: activeQr.rawToken || undefined,
        generatedAt: activeQr.generatedAt.toISOString(),
        qrDataUrl,
      };
    }

    // Notification logs
    const [lastNotif] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.orderId, id))
      .orderBy(desc(notifications.sentAt))
      .limit(1);

    // Scan history
    const scans = await db
      .select()
      .from(scanHistory)
      .where(eq(scanHistory.orderId, id))
      .orderBy(desc(scanHistory.scannedAt))
      .limit(10);

    // Calculate delivery alert level
    const now = new Date();
    const deliveryDate = new Date(order.expectedDeliveryDate);
    const isClosed = ["DELIVERED", "CANCELLED"].includes(order.status);
    let alertLevel: "OVERDUE" | "DUE_TODAY" | "URGENT" | "UPCOMING" | "NORMAL" = "NORMAL";
    const diffMs = deliveryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (!isClosed) {
      if (diffMs < 0 && deliveryDate.toDateString() !== now.toDateString()) {
        alertLevel = "OVERDUE";
      } else if (deliveryDate.toDateString() === now.toDateString()) {
        alertLevel = "DUE_TODAY";
      } else if (diffDays === 1) {
        alertLevel = "URGENT";
      } else if (diffDays <= 2) {
        alertLevel = "UPCOMING";
      }
    }

    return NextResponse.json({
      order: {
        ...order,
        garments,
        activeQrCode: activeQrDetails,
        lastNotification: lastNotif || null,
        scanHistory: scans,
        deliveryAlert: {
          level: alertLevel,
          daysDifference: diffDays,
        },
      },
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Failed to fetch order details";
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!isAuthorized(currentUser, ["ADMIN", "SHOPKEEPER"])) {
      return NextResponse.json({ error: "Shopkeeper or owner access required" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const {
      slipNumber,
      slipImageUrl,
      expectedDeliveryDate,
      specialInstructions,
      garments, // optional updated garment list
    } = body;

    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (["DELIVERED", "CANCELLED"].includes(order.status)) {
      return NextResponse.json(
        { error: "Cannot edit an order that is already DELIVERED or CANCELLED" },
        { status: 400 }
      );
    }

    let isGarmentsModified = false;
    let newExpectedQuantity = order.expectedQuantity;

    // If garments array provided, update order_garments
    if (garments && Array.isArray(garments) && garments.length > 0) {
      isGarmentsModified = true;

      // Delete existing garments and insert new
      await db.delete(orderGarments).where(eq(orderGarments.orderId, id));

      let totalQty = 0;
      for (const g of garments) {
        const q = Math.max(1, parseInt(g.quantity, 10) || 1);
        totalQty += q;
        await db.insert(orderGarments).values({
          id: crypto.randomUUID(),
          orderId: id,
          garmentTypeId: g.garmentTypeId || null,
          hindiName: g.hindiName || "कपड़ा",
          englishName: g.englishName || "Garment",
          quantity: q,
          notes: g.notes?.trim() || null,
        });
      }
      newExpectedQuantity = totalQty;
    }

    // Business Rule (Section 9):
    // "Any change to garment details or quantities after successful verification must
    // invalidate the previous verification and require a fresh physical quantity check."
    const updateData: Record<string, unknown> = {
      slipNumber: slipNumber !== undefined ? slipNumber?.trim() || null : order.slipNumber,
      slipImageUrl: slipImageUrl !== undefined ? slipImageUrl?.trim() || null : order.slipImageUrl,
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : order.expectedDeliveryDate,
      specialInstructions: specialInstructions !== undefined ? specialInstructions?.trim() || null : order.specialInstructions,
      updatedAt: new Date(),
    };

    if (isGarmentsModified) {
      updateData.expectedQuantity = newExpectedQuantity;
      updateData.isQuantityVerified = false;
      updateData.actualQuantity = null;
      updateData.verifiedByStaffId = null;
      updateData.verifiedAt = null;

      // Invalidate active QR code if any existed
      await db
        .update(qrCodes)
        .set({
          isActive: false,
          invalidatedAt: new Date(),
          invalidationReason: "Garments or quantities updated; requires re-verification",
        })
        .where(eq(qrCodes.orderId, id));

      // Reset status to QUANTITY_PENDING
      updateData.status = "QUANTITY_PENDING";
    }

    await db.update(orders).set(updateData).where(eq(orders.id, id));

    if (currentUser) {
      await db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        staffId: currentUser.id,
        action: isGarmentsModified ? "ORDER_GARMENTS_MODIFIED" : "ORDER_UPDATED",
        entityType: "ORDER",
        entityId: id,
        details: isGarmentsModified
          ? `Order ${order.orderNumber} garments updated. Previous verification invalidated; reset to QUANTITY_PENDING.`
          : `Order ${order.orderNumber} details updated.`,
      });
    }

    return NextResponse.json({
      success: true,
      message: isGarmentsModified
        ? "Garments updated. Previous verification invalidated. Order reset to Quantity Pending."
        : "Order details updated successfully",
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Failed to update order";
    return NextResponse.json({ error }, { status: 500 });
  }
}
