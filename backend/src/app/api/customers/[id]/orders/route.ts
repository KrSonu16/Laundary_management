import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderGarments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const customerOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.customerId, id))
      .orderBy(desc(orders.createdAt));

    const ordersWithGarments = await Promise.all(
      customerOrders.map(async (order) => {
        const garments = await db
          .select()
          .from(orderGarments)
          .where(eq(orderGarments.orderId, order.id));

        return {
          ...order,
          garments,
        };
      })
    );

    return NextResponse.json({ orders: ordersWithGarments });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Failed to fetch customer orders";
    return NextResponse.json({ error }, { status: 500 });
  }
}
