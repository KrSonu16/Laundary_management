import crypto from "crypto";
import QRCode from "qrcode";

/**
 * Generate a cryptographically secure random token for QR code.
 * Example: 32 bytes hex string (64 characters).
 */
export function generateSecureQrToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Calculate SHA-256 hash of the token.
 * Only this hash is stored in the database.
 */
export function hashQrToken(token: string): string {
  return crypto.createHash("sha256").update(token.trim()).digest("hex");
}

/**
 * Extract a human-readable prefix for sticker label reference.
 * Example: DCQR-A1B2
 */
export function generateQrDisplayPrefix(token: string): string {
  const short = token.slice(0, 8).toUpperCase();
  return `DCQR-${short.slice(0, 4)}-${short.slice(4, 8)}`;
}

/**
 * Generate a high-contrast QR Code Data URL (PNG base64)
 * Printable on 50x50mm thermal labels or A4 sticker paper.
 */
export async function generateQrDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 320,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });
}

/**
 * Normalize Indian mobile numbers:
 * Removes spaces, dashes, +91 prefix, and returns clean 10-digit number.
 */
export function normalizeMobileNumber(raw: string): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }
  return digits.slice(-10);
}

/**
 * Check if a mobile number is valid 10 digits.
 */
export function isValidMobileNumber(mobile: string): boolean {
  const norm = normalizeMobileNumber(mobile);
  return /^[6-9]\d{9}$/.test(norm);
}
