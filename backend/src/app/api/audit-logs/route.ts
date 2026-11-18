import { NextResponse } from "next/server";
import { db } from "@/db";
import { auditLogs, staffUsers } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getCurrentUser, isAuthorized } from "@/lib/auth";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!isAuthorized(currentUser, ["ADMIN"])) {
      return NextResponse.json({ error: "Admin role required" }, { status: 403 });
    }

    const logs = await db
      .select({
        id: auditLogs.id,
        staffId: auditLogs.staffId,
        staffName: staffUsers.name,
        staffRole: staffUsers.role,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        details: auditLogs.details,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(staffUsers, eq(auditLogs.staffId, staffUsers.id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(100);

    return NextResponse.json({ logs });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Failed to load audit logs";
    return NextResponse.json({ error }, { status: 500 });
  }
}
