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
  req: NextRequest,
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
    const body = await req.json().catch(() => ({}));
    const reason = body?.reason || "Label damaged or lost";

    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!order.isQuantityVerified) {
      return NextResponse.json(
        { error: "Order quantity is not verified" },
        { status: 400 }
      );
    }

    // Invalidate any currently active QR code
    const existingQrs = await db
      .select()
      .from(qrCodes)
      .where(eq(qrCodes.orderId, id))
      .orderBy(desc(qrCodes.generatedAt));

    const activeQr = existingQrs.find((q) => q.isActive);
    if (activeQr) {
      await db
        .update(qrCodes)
        .set({
          isActive: false,
          invalidatedAt: new Date(),
          invalidationReason: reason,
        })
        .where(eq(qrCodes.id, activeQr.id));
    }

    // Generate fresh replacement token
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
      regenerationCount: existingQrs.length + 1,
    });

    const qrDataUrl = await generateQrDataUrl(rawToken);

    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      staffId: currentUser.id,
      action: "QR_REGENERATED",
      entityType: "ORDER",
      entityId: id,
      details: `Replacement QR ${prefix} generated for order ${order.orderNumber} (Old QR invalidated). Reason: ${reason}`,
    });

    return NextResponse.json({
      success: true,
      message: `Replacement QR code generated for order ${order.orderNumber}`,
      qr: {
        id: qrId,
        tokenDisplayPrefix: prefix,
        rawToken,
        qrDataUrl,
        orderNumber: order.orderNumber,
      },
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Failed to regenerate QR";
    return NextResponse.json({ error }, { status: 500 });
  }
}
