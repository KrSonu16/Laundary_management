import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers, orders, auditLogs } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { getCurrentUser, isAuthorized } from "@/lib/auth";
import { normalizeMobileNumber, isValidMobileNumber } from "@/lib/crypto";
import crypto from "crypto";

export async function GET() {
  try {
    const list = await db
      .select({
        id: customers.id,
        name: customers.name,
        mobile: customers.mobile,
        alternateMobile: customers.alternateMobile,
        address: customers.address,
        notes: customers.notes,
        createdAt: customers.createdAt,
        updatedAt: customers.updatedAt,
      })
      .from(customers)
      .orderBy(desc(customers.createdAt))
      .limit(100);

    return NextResponse.json({ customers: list });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Failed to fetch customers";
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
    const { name, mobile, alternateMobile, address, notes } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Customer name is required / ग्राहक का नाम अनिवार्य है" },
        { status: 400 }
      );
    }

    const cleanMobile = normalizeMobileNumber(mobile);
    if (!isValidMobileNumber(cleanMobile)) {
      return NextResponse.json(
        { error: "Please enter a valid 10-digit mobile number / कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें" },
        { status: 400 }
      );
    }

    // Check if customer with exact mobile already exists
    const [existing] = await db
      .select()
      .from(customers)
      .where(eq(customers.mobile, cleanMobile))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        {
          error: "Customer with this mobile number already exists / इस मोबाइल नंबर का ग्राहक पहले से मौजूद है",
          existingCustomer: existing,
        },
        { status: 409 }
      );
    }

    const customerId = crypto.randomUUID();
    const newCustomer = {
      id: customerId,
      name: name.trim(),
      mobile: cleanMobile,
      alternateMobile: alternateMobile ? normalizeMobileNumber(alternateMobile) : null,
      address: address?.trim() || null,
      notes: notes?.trim() || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(customers).values(newCustomer);

    if (currentUser) {
      await db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        staffId: currentUser.id,
        action: "CUSTOMER_CREATED",
        entityType: "CUSTOMER",
        entityId: customerId,
        details: `Customer registered: ${newCustomer.name} (${newCustomer.mobile})`,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Customer registered successfully / ग्राहक सफलतापूर्वक पंजीकृत हुआ",
      customer: newCustomer,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Failed to create customer";
    return NextResponse.json({ error }, { status: 500 });
  }
}
