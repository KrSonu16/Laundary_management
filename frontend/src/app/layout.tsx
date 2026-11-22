import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/lib/LanguageContext";
import { ShopProvider } from "@/lib/ShopContext";

export const metadata: Metadata = {
  title: "DC Smart Laundry",
  description: "Laundry Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          <ShopProvider>
            {children}
          </ShopProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
