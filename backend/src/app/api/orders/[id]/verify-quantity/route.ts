import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, quantityCorrections, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser, isAuthorized } from "@/lib/auth";
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

    const { id } = await params;
    const body = await req.json();
    const {
      actualQuantity,
      confirmed,
      isOwnerOverride,
      overrideReason,
    } = body;

    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (["DELIVERED", "CANCELLED"].includes(order.status)) {
      return NextResponse.json(
        { error: "Cannot verify quantity for DELIVERED or CANCELLED order" },
        { status: 400 }
      );
    }

    const parsedActual = parseInt(actualQuantity, 10);
    if (isNaN(parsedActual) || parsedActual <= 0) {
      return NextResponse.json(
        { error: "Valid actual checked quantity is required / वैध जाँची गई संख्या आवश्यक है" },
        { status: 400 }
      );
    }

    // Explicit confirmation required
    if (!confirmed) {
      return NextResponse.json(
        {
          error:
            "Physical confirmation is required: 'I have manually checked all garments and verified the total quantity.'",
        },
        { status: 400 }
      );
    }

    // Check for quantity mismatch
    if (parsedActual !== order.expectedQuantity) {
      if (isOwnerOverride) {
        // Only ADMIN/OWNER can authorize exceptional quantity correction
        if (!isAuthorized(currentUser, ["ADMIN"])) {
          return NextResponse.json(
            {
              error:
                "Only Shop Owner/Admin can authorize exceptional quantity corrections / केवल मालिक/एडमिन ही मात्रा सुधार अधिकृत कर सकते हैं",
            },
            { status: 403 }
          );
        }

        if (!overrideReason || !overrideReason.trim()) {
          return NextResponse.json(
            { error: "Reason for quantity correction is mandatory / मात्रा सुधार का कारण अनिवार्य है" },
            { status: 400 }
          );
        }

        // Record exceptional correction
        await db.insert(quantityCorrections).values({
          id: crypto.randomUUID(),
          orderId: id,
          previousExpectedQuantity: order.expectedQuantity,
          newExpectedQuantity: parsedActual,
          reason: overrideReason.trim(),
          authorizedByStaffId: currentUser.id,
          createdAt: new Date(),
        });

        // Update order expected and actual quantity
        await db
          .update(orders)
          .set({
            expectedQuantity: parsedActual,
            actualQuantity: parsedActual,
            isQuantityVerified: true,
            verifiedByStaffId: currentUser.id,
            verifiedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(orders.id, id));

        await db.insert(auditLogs).values({
          id: crypto.randomUUID(),
          staffId: currentUser.id,
          action: "EXCEPTIONAL_QUANTITY_OVERRIDE",
          entityType: "ORDER",
          entityId: id,
          details: `Owner override on order ${order.orderNumber}: Expected changed from ${order.expectedQuantity} to ${parsedActual}. Reason: ${overrideReason}`,
        });

        return NextResponse.json({
          success: true,
          verified: true,
          isOverride: true,
          message: `Quantity corrected by Owner from ${order.expectedQuantity} to ${parsedActual}. Verification successful. Ready for QR generation.`,
          expectedQuantity: parsedActual,
          actualQuantity: parsedActual,
        });
      }

      // Block verification due to mismatch
      return NextResponse.json(
        {
          success: false,
          verified: false,
          mismatch: true,
          expectedQuantity: order.expectedQuantity,
          actualQuantity: parsedActual,
          difference: parsedActual - order.expectedQuantity,
          error: `Quantity mismatch: Expected ${order.expectedQuantity} garments, but physically checked ${parsedActual}. QR generation is blocked. Please recheck garments or request Owner Authorization.`,
        },
        { status: 422 }
      );
    }

    // Matching quantities and explicit confirmation
    await db
      .update(orders)
      .set({
        actualQuantity: parsedActual,
        isQuantityVerified: true,
        verifiedByStaffId: currentUser.id,
        verifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id));

    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      staffId: currentUser.id,
      action: "QUANTITY_VERIFIED",
      entityType: "ORDER",
      entityId: id,
      details: `Physical quantity verified for ${order.orderNumber}: ${parsedActual}/${order.expectedQuantity} checked by ${currentUser.name}`,
    });

    return NextResponse.json({
      success: true,
      verified: true,
      mismatch: false,
      message: `Garment quantity verified (${parsedActual}/${order.expectedQuantity}). QR Code can now be generated.`,
      expectedQuantity: order.expectedQuantity,
      actualQuantity: parsedActual,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Quantity verification failed";
    return NextResponse.json({ error }, { status: 500 });
  }
}
