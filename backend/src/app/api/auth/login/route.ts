import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, staffUsers } from "@/db/schema";
import {
  comparePassword,
  createSession,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
} from "@/lib/auth";

const genericFailure = "The account details could not be verified.";

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: genericFailure }, { status: 400 });
    }
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: genericFailure }, { status: 400 });
    }

    const input = body as { identifier?: unknown; password?: unknown };
    const identifier = typeof input.identifier === "string" ? input.identifier.trim() : "";
    const password = typeof input.password === "string" ? input.password : "";

    if (!identifier || identifier.length > 254 || !password || password.length > 512) {
      return NextResponse.json({ error: genericFailure }, { status: 400 });
    }

    const normalizedIdentifier = identifier.toLowerCase();
    const [user] = await db
      .select()
      .from(staffUsers)
      .where(
        and(
          or(eq(staffUsers.email, normalizedIdentifier), eq(staffUsers.mobile, identifier)),
          eq(staffUsers.isActive, true)
        )
      )
      .limit(1);

    const passwordMatches = user
      ? await comparePassword(password, user.passwordHash)
      : await comparePassword(password, "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy");

    if (!user || !passwordMatches) {
      return NextResponse.json({ error: genericFailure }, { status: 401 });
    }

    const sessionToken = await createSession(user.id);

    await db.insert(auditLogs).values({
      id: randomUUID(),
      staffId: user.id,
      action: "LOGIN",
      entityType: "STAFF_USER",
      entityId: user.id,
      details: JSON.stringify({ name: user.name, role: user.role }),
    });

    const response = NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_SECONDS,
    });

    return response;
  } catch (error) {
    console.error("[api/auth/login] Login failed", error);
    return NextResponse.json({ error: "Sign-in is temporarily unavailable." }, { status: 500 });
  }
}
