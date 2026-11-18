import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, auditLogs } from "@/db/schema";
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
        { error: "Unauthorized. Only shopkeeper or owner can mark orders delivered." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { handoverConfirmed } = body;

    if (!handoverConfirmed) {
      return NextResponse.json(
        {
          error:
            "Physical handover confirmation is required / कपड़ों के भौतिक सुपुर्दगी की पुष्टि आवश्यक है",
        },
        { status: 400 }
      );
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status === "DELIVERED") {
      return NextResponse.json(
        {
          error: `Order ${order.orderNumber} is already marked DELIVERED on ${order.deliveredAt?.toLocaleDateString("en-IN")}. Cannot deliver again.`,
        },
        { status: 400 }
      );
    }

    if (order.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Cannot deliver a CANCELLED order." },
        { status: 400 }
      );
    }

    // Mark as DELIVERED
    const deliveryTime = new Date();
    await db
      .update(orders)
      .set({
        status: "DELIVERED",
        deliveredAt: deliveryTime,
        deliveredByStaffId: currentUser?.id || null,
        updatedAt: deliveryTime,
      })
      .where(eq(orders.id, id));

    if (currentUser) {
      await db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        staffId: currentUser.id,
        action: "ORDER_DELIVERED",
        entityType: "ORDER",
        entityId: id,
        details: `Order ${order.orderNumber} physically delivered to customer by ${currentUser.name} at ${deliveryTime.toLocaleTimeString("en-IN")}`,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Order ${order.orderNumber} successfully marked as DELIVERED / कपड़े ग्राहक को सुपुर्द किए गए`,
      orderNumber: order.orderNumber,
      deliveredAt: deliveryTime.toISOString(),
      deliveredBy: currentUser?.name || "Staff",
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Failed to mark order as delivered";
    return NextResponse.json({ error }, { status: 500 });
  }
}
