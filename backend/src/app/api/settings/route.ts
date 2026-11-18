import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { appSettings, auditLogs } from "@/db/schema";
import { getCurrentUser, isAuthorized } from "@/lib/auth";
import crypto from "crypto";

export async function GET() {
  try {
    const list = await db.select().from(appSettings);
    const settingsObj: Record<string, string> = {};
    for (const item of list) {
      settingsObj[item.key] = item.value;
    }
    return NextResponse.json({ settings: settingsObj });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Failed to load settings";
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!isAuthorized(currentUser, ["ADMIN"])) {
      return NextResponse.json({ error: "Admin role required to modify settings" }, { status: 403 });
    }

    const body = await req.json();
    const { settings } = body; // key-value dictionary

    if (!settings || typeof settings !== "object") {
      return NextResponse.json({ error: "Invalid settings object" }, { status: 400 });
    }

    for (const [key, value] of Object.entries(settings)) {
      const valStr = String(value);
      // Upsert into appSettings
      await db
        .insert(appSettings)
        .values({
          id: crypto.randomUUID(),
          key,
          value: valStr,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: appSettings.key,
          set: {
            value: valStr,
            updatedAt: new Date(),
          },
        });
    }

    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      staffId: currentUser!.id,
      action: "SETTINGS_UPDATED",
      entityType: "SETTINGS",
      entityId: "APP_CONFIG",
      details: `Settings updated by ${currentUser!.name}`,
    });

    return NextResponse.json({ success: true, message: "Settings saved successfully" });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Failed to save settings";
    return NextResponse.json({ error }, { status: 500 });
  }
}
