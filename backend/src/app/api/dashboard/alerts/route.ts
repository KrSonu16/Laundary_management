import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders, customers } from "@/db/schema";
import { eq, sql, desc, and } from "drizzle-orm";
import { OrderStatus } from "@/lib/types";

export async function GET() {
  try {
    const activeOrders = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        customerId: orders.customerId,
        customerName: customers.name,
        customerMobile: customers.mobile,
        expectedQuantity: orders.expectedQuantity,
        status: orders.status,
        expectedDeliveryDate: orders.expectedDeliveryDate,
        slipNumber: orders.slipNumber,
      })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(sql`${orders.status} NOT IN ('DELIVERED', 'CANCELLED')`)
      .orderBy(orders.expectedDeliveryDate);

    const now = new Date();
    const todayStr = now.toDateString();

    const overdue: typeof activeOrders = [];
    const dueToday: typeof activeOrders = [];
    const urgent: typeof activeOrders = [];
    const upcoming: typeof activeOrders = [];
    const pickupPending: typeof activeOrders = [];

    for (const order of activeOrders) {
      if (order.status === "READY") {
        pickupPending.push(order);
      }

      const deliveryDate = new Date(order.expectedDeliveryDate);
      const isToday = deliveryDate.toDateString() === todayStr;
      const diffMs = deliveryDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffMs < 0 && !isToday) {
        overdue.push(order);
      } else if (isToday) {
        dueToday.push(order);
      } else if (diffDays === 1) {
        urgent.push(order);
      } else if (diffDays === 2) {
        upcoming.push(order);
      }
    }

    return NextResponse.json({
      alerts: {
        overdue: {
          count: overdue.length,
          labelHindi: "विलंबित ऑर्डर / Overdue",
          level: "OVERDUE",
          orders: overdue,
        },
        dueToday: {
          count: dueToday.length,
          labelHindi: "आज देय / Due Today",
          level: "DUE_TODAY",
          orders: dueToday,
        },
        urgent: {
          count: urgent.length,
          labelHindi: "कल देय / Urgent (1 Day Left)",
          level: "URGENT",
          orders: urgent,
        },
        upcoming: {
          count: upcoming.length,
          labelHindi: "आगामी डिलीवरी / Upcoming (2 Days)",
          level: "UPCOMING",
          orders: upcoming,
        },
        pickupPending: {
          count: pickupPending.length,
          labelHindi: "पिकअप प्रतीक्षारत / Ready for Pickup",
          level: "READY",
          orders: pickupPending,
        },
      },
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Failed to load alerts";
    return NextResponse.json({ error }, { status: 500 });
  }
}
