import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to start the backend.");
}

// Neon direct IP fallback resolver for local ISP DNS bypass
let poolConfig: any = {
  connectionString,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  maxLifetimeSeconds: 600,
};

// Check if connecting to Neon AWS us-east-1 and local DNS fails
try {
  const url = new URL(connectionString);
  if (url.hostname.includes("neon.tech")) {
    poolConfig = {
      ...poolConfig,
      connectionString: undefined,
      host: "44.218.206.133", // Neon us-east-1 ingress IP
      port: url.port ? parseInt(url.port, 10) : 5432,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, ""),
      ssl: {
        rejectUnauthorized: false,
        servername: url.hostname,
      },
      options: `endpoint=${url.hostname.split(".")[0]}`,
    };
  }
} catch {
  // Use default connection string
}

export const pool = new Pool(poolConfig);

pool.on("error", (error) => {
  console.error("[database] Idle client error", error);
});

export const db = drizzle(pool, { schema });
