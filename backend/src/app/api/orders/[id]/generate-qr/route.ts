import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, qrCodes, auditLogs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCurrentUser, isAuthorized } from "@/lib/auth";
import {
  generateSecureQrToken,
  hashQrToken,
  generateQrDisplayPrefix,
  generateQrDataUrl,
} from "@/lib/crypto";
import crypto from "crypto";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (!isAuthorized(currentUser, ["ADMIN", "SHOPKEEPER"])) {
      return NextResponse.json({ error: "Shopkeeper or owner access required" }, { status: 403 });
    }

    const { id } = await params;

    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (["DELIVERED", "CANCELLED"].includes(order.status)) {
      return NextResponse.json(
        { error: "Cannot generate QR code for DELIVERED or CANCELLED order" },
        { status: 400 }
      );
    }

    // Critical Requirement: Generate QR only after successful manual quantity verification
    if (!order.isQuantityVerified) {
      return NextResponse.json(
        {
          error:
            "Manual garment quantity verification is mandatory before QR generation. / QR कोड बनाने से पहले कपड़ों की भौतिक जाँच अनिवार्य है।",
        },
        { status: 400 }
      );
    }

    // Check if an active QR already exists
    const [existingActiveQr] = await db
      .select()
      .from(qrCodes)
      .where(eq(qrCodes.orderId, id))
      .orderBy(desc(qrCodes.generatedAt))
      .limit(1);

    if (existingActiveQr && existingActiveQr.isActive) {
      // Invalidate old QR when generating fresh
      await db
        .update(qrCodes)
        .set({
          isActive: false,
          invalidatedAt: new Date(),
          invalidationReason: "New QR generated",
        })
        .where(eq(qrCodes.id, existingActiveQr.id));
    }

    // Generate fresh cryptographically secure random token
    const rawToken = generateSecureQrToken();
    const tokenHash = hashQrToken(rawToken);
    const prefix = generateQrDisplayPrefix(rawToken);

    const qrId = crypto.randomUUID();
    await db.insert(qrCodes).values({
      id: qrId,
      orderId: id,
      tokenHash,
      rawToken,
      tokenDisplayPrefix: prefix,
      isActive: true,
      generatedByStaffId: currentUser.id,
      generatedAt: new Date(),
      regenerationCount: (existingActiveQr?.regenerationCount || 0) + 1,
    });

    // Update order status to QR_GENERATED
    await db
      .update(orders)
      .set({
        status: "QR_GENERATED",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id));

    // Generate high resolution QR Data URL for thermal sticker printing (payload has no PII)
    const qrPayload = rawToken; // Scannable raw token
    const qrDataUrl = await generateQrDataUrl(qrPayload);

    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      staffId: currentUser.id,
      action: "QR_GENERATED",
      entityType: "ORDER",
      entityId: id,
      details: `QR Code ${prefix} generated for order ${order.orderNumber} by ${currentUser.name}`,
    });

    return NextResponse.json({
      success: true,
      message: `QR code generated successfully for order ${order.orderNumber}`,
      qr: {
        id: qrId,
        tokenDisplayPrefix: prefix,
        rawToken, // Sent once upon generation so printer/screen can test or print immediately
        qrDataUrl,
        orderNumber: order.orderNumber,
        expectedQuantity: order.expectedQuantity,
      },
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Failed to generate QR code";
    return NextResponse.json({ error }, { status: 500 });
  }
}
