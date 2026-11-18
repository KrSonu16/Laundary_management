import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser, isAuthorized } from "@/lib/auth";
import { normalizeMobileNumber, isValidMobileNumber } from "@/lib/crypto";
import crypto from "crypto";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({ customer });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Failed to fetch customer";
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!isAuthorized(currentUser, ["ADMIN", "SHOPKEEPER"])) {
      return NextResponse.json({ error: "Shopkeeper or owner access required" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, mobile, alternateMobile, address, notes } = body;

    const [existing] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    let cleanMobile = existing.mobile;
    if (mobile) {
      cleanMobile = normalizeMobileNumber(mobile);
      if (!isValidMobileNumber(cleanMobile)) {
        return NextResponse.json(
          { error: "Invalid 10-digit mobile number" },
          { status: 400 }
        );
      }
    }

    await db
      .update(customers)
      .set({
        name: name !== undefined ? name.trim() : existing.name,
        mobile: cleanMobile,
        alternateMobile:
          alternateMobile !== undefined
            ? alternateMobile
              ? normalizeMobileNumber(alternateMobile)
              : null
            : existing.alternateMobile,
        address: address !== undefined ? address?.trim() || null : existing.address,
        notes: notes !== undefined ? notes?.trim() || null : existing.notes,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, id));

    if (currentUser) {
      await db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        staffId: currentUser.id,
        action: "CUSTOMER_UPDATED",
        entityType: "CUSTOMER",
        entityId: id,
        details: `Customer details updated: ${name || existing.name}`,
      });
    }

    const [updated] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);

    return NextResponse.json({
      success: true,
      message: "Customer updated successfully",
      customer: updated,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Failed to update customer";
    return NextResponse.json({ error }, { status: 500 });
  }
}
