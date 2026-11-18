import { randomUUID } from "node:crypto";
import { db, pool } from "@/db";
import { staffUsers } from "@/db/schema";
import { hashPassword } from "@/lib/auth";

async function bootstrapAdmin() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const mobile = process.env.BOOTSTRAP_ADMIN_MOBILE?.replace(/\D/g, "");
  const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  if (!email || !mobile || !name || !password || password.length < 14) {
    throw new Error("Set BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_MOBILE, BOOTSTRAP_ADMIN_NAME, and a password of at least 14 characters.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || mobile.length < 8 || mobile.length > 15) {
    throw new Error("The administrator email or mobile number is invalid.");
  }

  await db.transaction(async (transaction) => {
    const [existing] = await transaction.select({ id: staffUsers.id }).from(staffUsers).limit(1);
    if (existing) throw new Error("Staff accounts already exist; bootstrap is only allowed for an empty staff directory.");

    await transaction.insert(staffUsers).values({
      id: randomUUID(),
      name,
      email,
      mobile,
      role: "ADMIN",
      passwordHash: await hashPassword(password),
      isActive: true,
    });
  });

  console.info("Initial administrator created. No credentials were printed.");
}

bootstrapAdmin()
  .catch((error: unknown) => {
    console.error("Administrator bootstrap failed:", error instanceof Error ? error.message : "Unknown error");
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
