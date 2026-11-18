import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { garmentTypes, auditLogs } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { getCurrentUser, isAuthorized } from "@/lib/auth";
import crypto from "crypto";

export async function GET() {
  try {
    const list = await db
      .select()
      .from(garmentTypes)
      .orderBy(asc(garmentTypes.displayOrder));

    return NextResponse.json({ garments: list });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Failed to fetch garment catalogue";
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!isAuthorized(user, ["ADMIN"])) {
      return NextResponse.json(
        { error: "Unauthorized. Admin role required. / केवल एडमिन परिधान जोड़ सकते हैं।" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { hindiName, englishName, category, iconName, displayOrder } = body;

    if (!hindiName || !englishName) {
      return NextResponse.json(
        { error: "Both Hindi and English garment names are required" },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    const newItem = {
      id,
      hindiName: hindiName.trim(),
      englishName: englishName.trim(),
      category: category?.trim() || "General",
      iconName: iconName?.trim() || "Shirt",
      isActive: true,
      displayOrder: displayOrder || 99,
      createdAt: new Date(),
    };

    await db.insert(garmentTypes).values(newItem);

    if (user) {
      await db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        staffId: user.id,
        action: "GARMENT_CATALOG_ADDED",
        entityType: "GARMENT",
        entityId: id,
        details: `Added garment type: ${newItem.hindiName} / ${newItem.englishName}`,
      });
    }

    return NextResponse.json({ success: true, garment: newItem });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Failed to add garment";
    return NextResponse.json({ error }, { status: 500 });
  }
}
