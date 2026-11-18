import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, qrCodes, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser, isAuthorized } from "@/lib/auth";
import crypto from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!isAuthorized(currentUser, ["ADMIN", "SHOPKEEPER"])) {
      return NextResponse.json(
        { error: "Unauthorized to cancel order" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { reason } = body;

    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status === "DELIVERED") {
      return NextResponse.json(
        { error: "Delivered order cannot be cancelled / डिलीवर हो चुके ऑर्डर को रद्द नहीं किया जा सकता" },
        { status: 400 }
      );
    }

    if (order.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Order is already cancelled / ऑर्डर पहले ही रद्द है" },
        { status: 400 }
      );
    }

    // Invalidate any active QR code
    await db
      .update(qrCodes)
      .set({
        isActive: false,
        invalidatedAt: new Date(),
        invalidationReason: `Order cancelled: ${reason || "No reason specified"}`,
      })
      .where(eq(qrCodes.orderId, id));

    // Update order status to CANCELLED
    await db
      .update(orders)
      .set({
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancellationReason: reason?.trim() || "Cancelled by staff",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id));

    if (currentUser) {
      await db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        staffId: currentUser.id,
        action: "ORDER_CANCELLED",
        entityType: "ORDER",
        entityId: id,
        details: `Order ${order.orderNumber} cancelled. Reason: ${reason || "None"}`,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Order ${order.orderNumber} cancelled successfully`,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Failed to cancel order";
    return NextResponse.json({ error }, { status: 500 });
  }
}
