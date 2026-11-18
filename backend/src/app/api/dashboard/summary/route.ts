import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { sql } from "drizzle-orm";
import { DashboardSummary } from "@/lib/types";

export async function GET() {
  try {
    // 1. Total Active Orders (not DELIVERED or CANCELLED)
    const [activeRes] = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(sql`${orders.status} NOT IN ('DELIVERED', 'CANCELLED')`);

    // 2. Orders Received Today
    const [receivedTodayRes] = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(sql`DATE(${orders.receivedDate}) = CURRENT_DATE`);

    // 3. In Processing
    const [processingRes] = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(sql`${orders.status} IN ('RECEIVED', 'PROCESSING')`);

    // 4. Quantity Verification Pending
    const [qtyPendingRes] = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(sql`${orders.status} = 'QUANTITY_PENDING'`);

    // 5. QR Generated (awaiting QR scanning)
    const [qrGenRes] = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(sql`${orders.status} = 'QR_GENERATED'`);

    // 6. Ready for Pickup
    const [readyRes] = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(sql`${orders.status} = 'READY'`);

    // 7. Due Today (active orders due today)
    const [dueTodayRes] = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(
        sql`${orders.status} NOT IN ('DELIVERED', 'CANCELLED') AND DATE(${orders.expectedDeliveryDate}) = CURRENT_DATE`
      );

    // 8. Overdue Orders (active orders where delivery date < current_date)
    const [overdueRes] = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(
        sql`${orders.status} NOT IN ('DELIVERED', 'CANCELLED') AND DATE(${orders.expectedDeliveryDate}) < CURRENT_DATE`
      );

    // 9. Delivered Today
    const [deliveredTodayRes] = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(sql`${orders.status} = 'DELIVERED' AND DATE(${orders.deliveredAt}) = CURRENT_DATE`);

    const summary: DashboardSummary = {
      totalActiveOrders: Number(activeRes?.count || 0),
      ordersReceivedToday: Number(receivedTodayRes?.count || 0),
      ordersInProcessing: Number(processingRes?.count || 0),
      quantityVerificationPending: Number(qtyPendingRes?.count || 0),
      qrGenerated: Number(qrGenRes?.count || 0),
      readyForPickup: Number(readyRes?.count || 0),
      dueToday: Number(dueTodayRes?.count || 0),
      overdueOrders: Number(overdueRes?.count || 0),
      deliveredToday: Number(deliveredTodayRes?.count || 0),
    };

    return NextResponse.json({ summary });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Failed to load dashboard summary";
    return NextResponse.json({ error }, { status: 500 });
  }
}
