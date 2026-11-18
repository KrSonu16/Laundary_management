import { NextResponse } from "next/server";
import { pool } from "@/db";

export async function GET() {
  try {
    await pool.query("SELECT 1");
    return NextResponse.json({ status: "ok", checks: { database: "ok" } });
  } catch (error) {
    console.error("[api/health] Database check failed", error);
    return NextResponse.json(
      { status: "degraded", checks: { database: "unavailable" } },
      { status: 503 }
    );
  }
}
