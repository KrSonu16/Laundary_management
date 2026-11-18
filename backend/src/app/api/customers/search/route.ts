import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers, orders } from "@/db/schema";
import { or, like, eq, desc } from "drizzle-orm";
import { normalizeMobileNumber } from "@/lib/crypto";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim() || "";

    if (!query) {
      return NextResponse.json({ customers: [] });
    }

    const cleanQuery = query.replace(/\D/g, ""); // digits for mobile search
    const textQuery = `%${query.toLowerCase()}%`;

    // Find customers matching exact or partial mobile, or matching name
    let matchedCustomers = [];
    if (cleanQuery.length >= 3) {
      matchedCustomers = await db
        .select()
        .from(customers)
        .where(
          or(
            like(customers.mobile, `%${cleanQuery}%`),
            like(customers.alternateMobile, `%${cleanQuery}%`),
            like(customers.name, textQuery)
          )
        )
        .limit(10);
    } else {
      matchedCustomers = await db
        .select()
        .from(customers)
        .where(like(customers.name, textQuery))
        .limit(10);
    }

    // Enhance matched customers with their active orders and total order count
    const results = await Promise.all(
      matchedCustomers.map(async (cust) => {
        const customerOrders = await db
          .select({
            id: orders.id,
            orderNumber: orders.orderNumber,
            status: orders.status,
            expectedQuantity: orders.expectedQuantity,
            receivedDate: orders.receivedDate,
            expectedDeliveryDate: orders.expectedDeliveryDate,
          })
          .from(orders)
          .where(eq(orders.customerId, cust.id))
          .orderBy(desc(orders.createdAt))
          .limit(5);

        const activeOrders = customerOrders.filter(
          (o) => !["DELIVERED", "CANCELLED"].includes(o.status)
        );

        return {
          ...cust,
          totalOrdersCount: customerOrders.length,
          activeOrdersCount: activeOrders.length,
          recentOrders: customerOrders,
          hasActiveOrders: activeOrders.length > 0,
        };
      })
    );

    return NextResponse.json({
      customers: results,
      totalMatches: results.length,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Search failed";
    return NextResponse.json({ error }, { status: 500 });
  }
}
