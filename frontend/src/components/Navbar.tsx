"use client";

import type { StaffUserDto } from "@/lib/types";
import { Bell, Check, ChevronDown, ClipboardList, Globe, LogOut, Plus, QrCode, Search, Settings, Waves } from "lucide-react";
import { useLanguage, Language } from "@/lib/LanguageContext";
import { useShop } from "@/lib/ShopContext";

interface NavbarProps {
  currentUser: StaffUserDto | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenNewOrder: () => void;
  onOpenQrScanner: () => void;
  onOpenCustomerSearch: () => void;
  onLogout: () => void;
  onOpenSettings?: () => void;
  alertsCount?: number;
}

const roleLabels: Record<string, { hi: string; en: string }> = {
  ADMIN: { hi: "मालिक · पूर्ण अधिकार", en: "Owner · Full access" },
  SHOPKEEPER: { hi: "दुकानदार", en: "Shopkeeper" },
  WORKSHOP: { hi: "कार्यशाला", en: "Workshop" },
};

export function Navbar({
  currentUser,
  activeTab,
  setActiveTab,
  onOpenNewOrder,
  onOpenQrScanner,
  onOpenCustomerSearch,
  onLogout,
  onOpenSettings,
  alertsCount = 0,
}: NavbarProps) {
  const { language, setLanguage, t } = useLanguage();
  const { shopName, shopTagline } = useShop();

  const navItems = [
    { id: "dashboard", label: t("डैशबोर्ड", "Overview"), icon: Waves },
    { id: "orders", label: t("ऑर्डर सूची", "Orders"), icon: ClipboardList },
    { id: "customers", label: t("ग्राहक खोज", "Customers"), icon: Search },
    { id: "alerts", label: t("डिलीवरी अलर्ट", "Delivery alerts"), icon: Bell },
  ];

  const getRoleLabel = (role: string) => {
    const r = roleLabels[role] || { hi: "स्टाफ", en: "Staff" };
    return t(r.hi, r.en);
  };
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] flex-col px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[68px] items-center justify-between gap-4">
          <button className="flex min-w-0 items-center gap-3 rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sea" onClick={() => setActiveTab("dashboard")} type="button">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-ink text-sea-soft"><Waves aria-hidden="true" className="size-5" /></span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold tracking-tight text-ink">{shopName}</span>
              <span className="hidden text-[11px] text-ink-muted sm:block">{shopTagline}</span>
            </span>
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Switcher Pill */}
            <div className="flex items-center rounded-xl border border-line bg-slate-50 p-0.5 text-xs font-semibold shadow-xs">
              <button
                type="button"
                onClick={() => setLanguage("hi")}
                className={`rounded-lg px-2 py-1 transition cursor-pointer ${language === "hi"
                  ? "bg-sea text-white shadow-xs font-bold"
                  : "text-ink-muted hover:text-ink"
                  }`}
                title="केवल हिंदी (Hindi Only)"
              >
                हिंदी
              </button>
              <button
                type="button"
                onClick={() => setLanguage("bilingual")}
                className={`rounded-lg px-2 py-1 transition cursor-pointer ${language === "bilingual"
                  ? "bg-sea text-white shadow-xs font-bold"
                  : "text-ink-muted hover:text-ink"
                  }`}
                title="हिंदी + English (Bilingual)"
              >
                हिं/En
              </button>
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={`rounded-lg px-2 py-1 transition cursor-pointer ${language === "en"
                  ? "bg-sea text-white shadow-xs font-bold"
                  : "text-ink-muted hover:text-ink"
                  }`}
                title="English Only"
              >
                EN
              </button>
            </div>

            {currentUser && currentUser.role !== "WORKSHOP" && (
              <button className="hidden h-9 items-center gap-2 rounded-lg bg-sea px-3 text-xs font-semibold text-white transition hover:bg-sea-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea sm:inline-flex" onClick={onOpenNewOrder} type="button">
                <Plus aria-hidden="true" className="size-4" /> {t("नया ऑर्डर", "New order")}
              </button>
            )}
            <button aria-label="Scan a bundle QR code" className="grid size-9 place-items-center rounded-lg border border-line bg-white text-ink-muted transition hover:border-sea/40 hover:text-sea focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea" onClick={onOpenQrScanner} type="button" title={t("QR स्कैनर", "Scan QR")}>
              <QrCode aria-hidden="true" className="size-4" />
            </button>
            {currentUser && (
              <div className="flex items-center gap-2 border-l border-line pl-2 sm:gap-3 sm:pl-3">
                <div className="hidden text-right md:block">
                  <p className="max-w-36 truncate text-xs font-semibold text-ink">{currentUser.name}</p>
                  <p className="mt-0.5 text-[10px] text-ink-muted">{getRoleLabel(currentUser.role)}</p>
                </div>
                <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-sage text-xs font-semibold text-sea-dark">
                  {currentUser.name.trim().slice(0, 1).toUpperCase() || "S"}
                </span>
                <button aria-label="Sign out" className="grid size-9 place-items-center rounded-lg text-ink-muted transition hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea cursor-pointer" onClick={onLogout} type="button" title={t("लॉग आउट", "Sign out")}>
                  <LogOut aria-hidden="true" className="size-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        <nav aria-label="Main navigation" className="-mx-1 flex items-center gap-1 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {navItems.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button aria-current={active ? "page" : undefined} className={`relative inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea ${active ? "bg-ink text-white" : "text-ink-muted hover:bg-linen hover:text-ink"}`} key={id} onClick={() => id === "customers" ? onOpenCustomerSearch() : setActiveTab(id)} type="button">
                <Icon aria-hidden="true" className="size-3.5" />
                {label}
                {id === "alerts" && alertsCount > 0 && <span aria-label={`${alertsCount} alerts`} className={`ml-0.5 min-w-5 rounded-full px-1 py-0.5 text-center text-[10px] font-semibold ${active ? "bg-white/15 text-white" : "bg-amber-100 text-amber-900"}`}>{alertsCount}</span>}
              </button>
            );
          })}
          {currentUser?.role === "ADMIN" && onOpenSettings && (
            <button aria-current={activeTab === "settings" ? "page" : undefined} className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea ${activeTab === "settings" ? "bg-ink text-white" : "text-ink-muted hover:bg-linen hover:text-ink"}`} onClick={() => { onOpenSettings(); setActiveTab("settings"); }} type="button">
              <Settings aria-hidden="true" className="size-3.5" /> Settings
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
