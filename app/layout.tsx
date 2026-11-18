import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "../frontend/src/globals.css";
import { LanguageProvider } from "../frontend/src/lib/LanguageContext";

export const metadata: Metadata = {
  title: "DC Laundry | Laundry Operations",
  description:
    "Manage laundry orders, garment checks, QR tracking, customer records, and delivery handovers from one secure workspace.",
  applicationName: "DC Smart Laundry",
};

export const viewport: Viewport = {
  themeColor: "#f4f6f2",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-linen text-ink antialiased">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
