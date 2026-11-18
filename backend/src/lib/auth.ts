import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { staffSessions, staffUsers } from "@/db/schema";
import type { StaffUserDto, UserRole } from "@/lib/types";
import bcrypt from "bcryptjs";

export const SESSION_COOKIE_NAME = "dc_laundry_session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

const validRoles = new Set<UserRole>(["ADMIN", "SHOPKEEPER", "WORKSHOP"]);

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export async function createSession(staffUserId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await db.insert(staffSessions).values({
    id: randomUUID(),
    staffUserId,
    tokenHash: hashSessionToken(token),
    expiresAt: new Date(Date.now() + SESSION_DURATION_SECONDS * 1000),
  });
  return token;
}

export async function revokeSessionToken(token: string): Promise<void> {
  await db.delete(staffSessions).where(eq(staffSessions.tokenHash, hashSessionToken(token)));
}

export async function getUserFromSessionToken(token: string): Promise<StaffUserDto | null> {
  if (!token || token.length > 128) return null;

  try {
    const [record] = await db
      .select({
        id: staffUsers.id,
        name: staffUsers.name,
        email: staffUsers.email,
        mobile: staffUsers.mobile,
        role: staffUsers.role,
        isActive: staffUsers.isActive,
        isTemporary: staffUsers.isTemporary,
        createdAt: staffUsers.createdAt,
      })
      .from(staffSessions)
      .innerJoin(staffUsers, eq(staffSessions.staffUserId, staffUsers.id))
      .where(
        and(
          eq(staffSessions.tokenHash, hashSessionToken(token)),
          gt(staffSessions.expiresAt, new Date()),
          eq(staffUsers.isActive, true)
        )
      )
      .limit(1);

    if (!record || !validRoles.has(record.role as UserRole)) return null;

    return {
      id: record.id,
      name: record.name,
      email: record.email,
      mobile: record.mobile,
      role: record.role as UserRole,
      isActive: record.isActive,
      isTemporary: record.isTemporary,
      createdAt: record.createdAt.toISOString(),
    };
  } catch (error) {
    console.error("[auth] Session lookup failed", error);
    return null;
  }
}

export async function getCurrentUser(): Promise<StaffUserDto | null> {
  try {
    const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
    return token ? getUserFromSessionToken(token) : null;
  } catch (error) {
    console.error("[auth] Current user lookup failed", error);
    return null;
  }
}

export function isAuthorized(user: StaffUserDto | null, allowedRoles: UserRole[]): user is StaffUserDto {
  return Boolean(user && user.isActive && allowedRoles.includes(user.role));
}
