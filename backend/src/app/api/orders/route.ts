import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderGarments, customers, qrCodes, auditLogs } from "@/db/schema";
import { desc, eq, like, or, sql, and } from "drizzle-orm";
import { getCurrentUser, isAuthorized } from "@/lib/auth";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.trim().toUpperCase() || "ALL";

    // Build conditions
    const conditions = [];

    if (status && status !== "ALL") {
      if (status === "OVERDUE") {
        // Active orders where expectedDeliveryDate < now
        conditions.push(
          and(
            sql`${orders.status} NOT IN ('DELIVERED', 'CANCELLED')`,
            sql`${orders.expectedDeliveryDate} < NOW()`
          )
        );
      } else if (status === "DUE_TODAY") {
        // Active orders where expectedDeliveryDate::date = current_date
        conditions.push(
          and(
            sql`${orders.status} NOT IN ('DELIVERED', 'CANCELLED')`,
            sql`DATE(${orders.expectedDeliveryDate}) = CURRENT_DATE`
          )
        );
      } else if (status === "PICKUP_PENDING") {
        conditions.push(eq(orders.status, "READY"));
      } else {
        conditions.push(eq(orders.status, status));
      }
    }

    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(
        or(
          like(orders.orderNumber, searchPattern),
          like(orders.slipNumber, searchPattern),
          like(customers.name, searchPattern),
          like(customers.mobile, searchPattern)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const list = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        customerId: orders.customerId,
        customerName: customers.name,
        customerMobile: customers.mobile,
        slipNumber: orders.slipNumber,
        slipImageUrl: orders.slipImageUrl,
        status: orders.status,
        expectedQuantity: orders.expectedQuantity,
        actualQuantity: orders.actualQuantity,
        isQuantityVerified: orders.isQuantityVerified,
        receivedDate: orders.receivedDate,
        expectedDeliveryDate: orders.expectedDeliveryDate,
        deliveredAt: orders.deliveredAt,
        cancelledAt: orders.cancelledAt,
        duplicateReceiptCount: orders.duplicateReceiptCount,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(whereClause)
      .orderBy(desc(orders.createdAt))
      .limit(100);

    // Compute alert level for each order
    const now = new Date();
    const enrichedList = list.map((order) => {
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

      return {
        ...order,
        alertLevel,
        daysDifference: diffDays,
      };
    });

    return NextResponse.json({ orders: enrichedList });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Failed to fetch orders";
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!isAuthorized(currentUser, ["ADMIN", "SHOPKEEPER"])) {
      return NextResponse.json({ error: "Shopkeeper or owner access required" }, { status: 403 });
    }

    const body = await req.json();
    const {
      customerId,
      slipNumber,
      slipImageUrl,
      expectedDeliveryDate,
      specialInstructions,
      garments, // array of { hindiName, englishName, quantity, notes }
    } = body;

    if (!customerId) {
      return NextResponse.json(
        { error: "Customer reference is required / ग्राहक चयन अनिवार्य है" },
        { status: 400 }
      );
    }

    if (!garments || !Array.isArray(garments) || garments.length === 0) {
      return NextResponse.json(
        { error: "At least one garment is required / कम से कम एक कपड़ा जोड़ना अनिवार्य है" },
        { status: 400 }
      );
    }

    if (!expectedDeliveryDate) {
      return NextResponse.json(
        { error: "Expected delivery date is required / डिलीवरी की तारीख अनिवार्य है" },
        { status: 400 }
      );
    }

    // Auto calculate expected total quantity as sum of all garment quantities
    let totalExpectedQty = 0;
    for (const g of garments) {
      const q = parseInt(g.quantity, 10) || 1;
      totalExpectedQty += Math.max(1, q);
    }

    // Generate human readable unique order number: DC-2026-xxxxx
    const year = new Date().getFullYear();
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(orders);
    const seq = Number(countResult[0]?.count || 0) + 101;
    const orderNumber = `DC-${year}-${String(seq).padStart(5, "0")}`;

    const orderId = crypto.randomUUID();

    // Initial status: QUANTITY_PENDING (ready for workshop garment check)
    await db.insert(orders).values({
      id: orderId,
      orderNumber,
      customerId,
      slipNumber: slipNumber?.trim() || null,
      slipImageUrl: slipImageUrl?.trim() || null,
      status: "QUANTITY_PENDING",
      expectedQuantity: totalExpectedQty,
      actualQuantity: null,
      isQuantityVerified: false,
      receivedDate: new Date(),
      expectedDeliveryDate: new Date(expectedDeliveryDate),
      createdByStaffId: currentUser?.id || null,
      specialInstructions: specialInstructions?.trim() || null,
    });

    // Insert garment line items
    for (const g of garments) {
      await db.insert(orderGarments).values({
        id: crypto.randomUUID(),
        orderId,
        garmentTypeId: g.garmentTypeId || null,
        hindiName: g.hindiName || "कपड़ा",
        englishName: g.englishName || "Garment",
        quantity: Math.max(1, parseInt(g.quantity, 10) || 1),
        notes: g.notes?.trim() || null,
      });
    }

    if (currentUser) {
      await db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        staffId: currentUser.id,
        action: "ORDER_CREATED",
        entityType: "ORDER",
        entityId: orderId,
        details: `Order ${orderNumber} created with ${totalExpectedQty} garments for customer ${customerId}`,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Order ${orderNumber} created successfully / ऑर्डर ${orderNumber} सफलतापूर्वक बनाया गया`,
      orderId,
      orderNumber,
      expectedQuantity: totalExpectedQty,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Failed to create order";
    return NextResponse.json({ error }, { status: 500 });
  }
}
