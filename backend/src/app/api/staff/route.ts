import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { staffUsers, auditLogs } from "@/db/schema";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { getCurrentUser, isAuthorized, hashPassword } from "@/lib/auth";
import crypto from "crypto";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!isAuthorized(currentUser, ["ADMIN"])) {
      return NextResponse.json({ error: "Admin role required" }, { status: 403 });
    }

    const list = await db
      .select({
        id: staffUsers.id,
        name: staffUsers.name,
        email: staffUsers.email,
        mobile: staffUsers.mobile,
        role: staffUsers.role,
        isActive: staffUsers.isActive,
        createdAt: staffUsers.createdAt,
      })
      .from(staffUsers)
      .orderBy(desc(staffUsers.createdAt));

    return NextResponse.json({ staff: list });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Failed to load staff";
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!isAuthorized(currentUser, ["ADMIN"])) {
      return NextResponse.json({ error: "Admin role required" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const mobile = typeof body?.mobile === "string" ? body.mobile.replace(/\D/g, "") : "";
    const role = body?.role;
    const password = typeof body?.password === "string" ? body.password : "";

    if (!name || !email || !mobile || !role || !password) {
      return NextResponse.json(
        { error: "Please complete every staff account field." },
        { status: 400 }
      );
    }

    const validRoles = ["ADMIN", "SHOPKEEPER", "WORKSHOP"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Choose a valid staff role." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || mobile.length < 8 || mobile.length > 15) {
      return NextResponse.json({ error: "Enter a valid email and mobile number." }, { status: 400 });
    }
    if (password.length < 14 || Buffer.byteLength(password, "utf8") > 72) {
      return NextResponse.json({ error: "Use a password between 14 and 72 characters." }, { status: 400 });
    }
    if (name.length > 100) {
      return NextResponse.json({ error: "The staff name is too long." }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(staffUsers)
      .where(eq(staffUsers.email, email))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "Staff with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const staffId = crypto.randomUUID();

    const newStaff = {
      id: staffId,
      name,
      email,
      mobile,
      role,
      passwordHash,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(staffUsers).values(newStaff);

    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      staffId: currentUser!.id,
      action: "STAFF_CREATED",
      entityType: "STAFF",
      entityId: staffId,
      details: `Created staff user ${newStaff.name} with role ${role}`,
    });

    return NextResponse.json({
      success: true,
      staff: {
        id: staffId,
        name: newStaff.name,
        email: newStaff.email,
        mobile: newStaff.mobile,
        role: newStaff.role,
      },
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Failed to create staff";
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!isAuthorized(currentUser, ["ADMIN"])) {
      return NextResponse.json({ error: "Owner access required" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const staffId = typeof body?.staffId === "string" ? body.staffId : "";
    const role = body?.role;
    const isActive = body?.isActive;
    const validRoles = ["ADMIN", "SHOPKEEPER", "WORKSHOP"];

    if (!staffId || !validRoles.includes(role) || typeof isActive !== "boolean") {
      return NextResponse.json({ error: "Choose a role and account status." }, { status: 400 });
    }
    if (staffId === currentUser.id) {
      return NextResponse.json({ error: "You cannot change your own access." }, { status: 400 });
    }

    const result = await db.transaction(async (transaction) => {
      await transaction.execute(sql`select pg_advisory_xact_lock(672146890)`);
      const [target] = await transaction
        .select({ id: staffUsers.id, name: staffUsers.name, role: staffUsers.role, isActive: staffUsers.isActive })
        .from(staffUsers)
        .where(eq(staffUsers.id, staffId))
        .limit(1);

      if (!target) {
        return { status: 404, body: { error: "Staff account not found." } };
      }

      if (target.role === "ADMIN" && target.isActive && (role !== "ADMIN" || !isActive)) {
        const [otherActiveOwner] = await transaction
          .select({ id: staffUsers.id })
          .from(staffUsers)
          .where(and(eq(staffUsers.role, "ADMIN"), eq(staffUsers.isActive, true), ne(staffUsers.id, staffId)))
          .limit(1);

        if (!otherActiveOwner) {
          return { status: 409, body: { error: "At least one active owner account must remain." } };
        }
      }

      await transaction
        .update(staffUsers)
        .set({ role, isActive, updatedAt: new Date() })
        .where(eq(staffUsers.id, staffId));
      await transaction.insert(auditLogs).values({
        id: crypto.randomUUID(),
        staffId: currentUser!.id,
        action: "STAFF_ACCESS_UPDATED",
        entityType: "STAFF",
        entityId: staffId,
        details: `Updated ${target.name}: role ${target.role} → ${role}; active ${target.isActive} → ${isActive}.`,
      });

      return { status: 200, body: { success: true } };
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Failed to update staff access";
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!isAuthorized(currentUser, ["ADMIN"])) {
      return NextResponse.json({ error: "Owner access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get("staffId")?.trim();

    if (!staffId) {
      return NextResponse.json({ error: "Staff ID is required" }, { status: 400 });
    }

    if (staffId === currentUser.id) {
      return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
    }

    const [target] = await db
      .select({ id: staffUsers.id, name: staffUsers.name, role: staffUsers.role })
      .from(staffUsers)
      .where(eq(staffUsers.id, staffId))
      .limit(1);

    if (!target) {
      return NextResponse.json({ error: "Staff account not found." }, { status: 404 });
    }

    if (target.role === "ADMIN") {
      const [otherActiveOwner] = await db
        .select({ id: staffUsers.id })
        .from(staffUsers)
        .where(and(eq(staffUsers.role, "ADMIN"), eq(staffUsers.isActive, true), ne(staffUsers.id, staffId)))
        .limit(1);

      if (!otherActiveOwner) {
        return NextResponse.json({ error: "At least one active owner account must remain." }, { status: 409 });
      }
    }

    await db.delete(staffUsers).where(eq(staffUsers.id, staffId));

    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      staffId: currentUser.id,
      action: "STAFF_DELETED",
      entityType: "STAFF",
      entityId: staffId,
      details: `Deleted staff member: ${target.name} (${target.role})`,
    });

    return NextResponse.json({ success: true, message: "Staff account permanently deleted." });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Failed to delete staff member";
    return NextResponse.json({ error }, { status: 500 });
  }
}
