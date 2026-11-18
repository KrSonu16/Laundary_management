import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { garmentTypes, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser, isAuthorized } from "@/lib/auth";
import crypto from "crypto";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!isAuthorized(user, ["ADMIN"])) {
      return NextResponse.json({ error: "Unauthorized. Admin only." }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { hindiName, englishName, category, iconName, isActive, displayOrder } = body;

    const [existing] = await db
      .select()
      .from(garmentTypes)
      .where(eq(garmentTypes.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Garment type not found" }, { status: 404 });
    }

    await db
      .update(garmentTypes)
      .set({
        hindiName: hindiName !== undefined ? hindiName.trim() : existing.hindiName,
        englishName: englishName !== undefined ? englishName.trim() : existing.englishName,
        category: category !== undefined ? category.trim() : existing.category,
        iconName: iconName !== undefined ? iconName.trim() : existing.iconName,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
        displayOrder: displayOrder !== undefined ? displayOrder : existing.displayOrder,
      })
      .where(eq(garmentTypes.id, id));

    if (user) {
      await db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        staffId: user.id,
        action: "GARMENT_CATALOG_UPDATED",
        entityType: "GARMENT",
        entityId: id,
        details: `Updated garment: ${existing.englishName}`,
      });
    }

    return NextResponse.json({ success: true, message: "Garment updated" });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Failed to update garment";
    return NextResponse.json({ error }, { status: 500 });
  }
}
