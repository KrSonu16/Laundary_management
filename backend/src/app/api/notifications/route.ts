import { NextResponse } from "next/server";
import { db } from "@/db";
import { notifications, orders, customers } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const list = await db
      .select({
        id: notifications.id,
        orderId: notifications.orderId,
        orderNumber: orders.orderNumber,
        customerName: customers.name,
        recipientMobile: notifications.recipientMobile,
        channel: notifications.channel,
        templateName: notifications.templateName,
        messageBody: notifications.messageBody,
        status: notifications.status,
        providerMessageId: notifications.providerMessageId,
        errorMessage: notifications.errorMessage,
        sentAt: notifications.sentAt,
      })
      .from(notifications)
      .innerJoin(orders, eq(notifications.orderId, orders.id))
      .leftJoin(customers, eq(notifications.customerId, customers.id))
      .orderBy(desc(notifications.sentAt))
      .limit(50);

    return NextResponse.json({ notifications: list });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Failed to load notifications";
    return NextResponse.json({ error }, { status: 500 });
  }
}
