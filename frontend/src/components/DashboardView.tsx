"use client";

import type { DashboardSummary, OrderDto, UserRole } from "@/lib/types";
import { useLanguage } from "@/lib/LanguageContext";
import {
  ArrowRight,
  CalendarClock,
  CheckCheck,
  ClipboardList,
  PackageCheck,
  Plus,
  QrCode,
  Search,
  Shirt,
  Truck,
} from "lucide-react";

interface DashboardViewProps {
  summary: DashboardSummary | null;
  recentOrders: OrderDto[];
  userRole?: UserRole;
  onOpenNewOrder: () => void;
  onOpenCustomerSearch: () => void;
  onOpenQrScanner: () => void;
  onSelectOrder: (orderId: string) => void;
  onNavigateToOrders: (statusFilter?: string) => void;
  onNavigateToAlerts: () => void;
}

const statusStyles: Record<string, string> = {
  RECEIVED: "bg-sand text-ink",
  PROCESSING: "bg-sea/10 text-sea-dark",
  QUANTITY_PENDING: "bg-amber-50 text-amber-800",
  QR_GENERATED: "bg-slate-100 text-slate-700",
  READY: "bg-emerald-50 text-emerald-800",
  DELIVERED: "bg-slate-100 text-slate-600",
  CANCELLED: "bg-red-50 text-red-700",
};

const statusLabels: Record<string, { hi: string; en: string }> = {
  RECEIVED: { hi: "प्राप्त", en: "Received" },
  PROCESSING: { hi: "प्रोसेसिंग", en: "In progress" },
  QUANTITY_PENDING: { hi: "जाँच बाकी", en: "Count check" },
  QR_GENERATED: { hi: "QR तैयार", en: "QR ready" },
  READY: { hi: "तैयार", en: "Ready" },
  DELIVERED: { hi: "डिलीवर", en: "Handed over" },
  CANCELLED: { hi: "रद्द", en: "Cancelled" },
};

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(date);
}

export function DashboardView({
  summary,
  recentOrders,
  userRole,
  onOpenNewOrder,
  onOpenCustomerSearch,
  onOpenQrScanner,
  onSelectOrder,
  onNavigateToOrders,
  onNavigateToAlerts,
}: DashboardViewProps) {
  const { t } = useLanguage();

  const getStatusLabel = (status: string) => {
    const s = statusLabels[status] || { hi: status, en: status };
    return t(s.hi, s.en);
  };

  const stats = [
    { label: t("सक्रिय ऑर्डर", "Active orders"), value: summary?.totalActiveOrders, note: t("दुकान में प्रगति पर", "Currently in workflow"), icon: ClipboardList, filter: "ALL" },
    { label: t("आज प्राप्त", "Received today"), value: summary?.ordersReceivedToday, note: t("आज के नए कपड़े", "New intake today"), icon: Shirt, filter: "RECEIVED" },
    { label: t("प्रोसेसिंग में", "In progress"), value: summary?.ordersInProcessing, note: t("धुलाई या प्रेसिंग चालू", "Being cleaned or finished"), icon: CalendarClock, filter: "PROCESSING" },
    { label: t("पिकअप के लिए तैयार", "Ready for pickup"), value: summary?.readyForPickup, note: t("ग्राहक को देने हेतु तैयार", "Waiting for handover"), icon: CheckCheck, filter: "READY" },
  ];

  return (
    <div className="flex flex-col gap-7 pb-8">
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.17em] text-sea">{t("दुकान अवलोकन", "Shop overview")}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-ink sm:text-4xl">{t("नमस्ते, आपका स्वागत है।", "Good to see you.")}</h1>
          <p className="mt-2 text-sm text-ink-muted">{t("आज के सभी लांड्री ऑर्डर्स और कार्यप्रवाह की स्पष्ट स्थिति।", "A clear view of today's laundry workflow.")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {userRole !== "WORKSHOP" && (
            <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-sea px-4 text-sm font-semibold text-white transition hover:bg-sea-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea cursor-pointer" onClick={onOpenNewOrder} type="button">
              <Plus aria-hidden="true" className="size-4" /> {t("नया ऑर्डर जोड़ें", "New order")}
            </button>
          )}
          <button className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-medium text-ink transition hover:bg-sand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea cursor-pointer" onClick={onOpenQrScanner} type="button">
            <QrCode aria-hidden="true" className="size-4" /> {t("बंडल QR स्कैन करें", "Scan bundle")}
          </button>
        </div>
      </section>

      {summary && (summary.overdueOrders > 0 || summary.dueToday > 0) && (
        <section aria-label="Delivery attention" className="grid gap-3 md:grid-cols-2">
          {summary.overdueOrders > 0 && (
            <button className="flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-left transition hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 cursor-pointer" onClick={onNavigateToAlerts} type="button">
              <span className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-red-700"><Truck aria-hidden="true" className="size-5" /></span>
                <span><span className="block text-sm font-semibold text-red-900">{summary.overdueOrders} {t("ऑर्डर विलंबित (Overdue)", "overdue orders")}</span><span className="mt-0.5 block text-xs text-red-800/75">{t("डिलीवरी कतार की तुरंत समीक्षा करें", "Review the delivery queue")}</span></span>
              </span>
              <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-red-700" />
            </button>
          )}
          {summary.dueToday > 0 && (
            <button className="flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-left transition hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 cursor-pointer" onClick={() => onNavigateToOrders("DUE_TODAY")} type="button">
              <span className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-amber-800"><CalendarClock aria-hidden="true" className="size-5" /></span>
                <span><span className="block text-sm font-semibold text-amber-950">{summary.dueToday} {t("ऑर्डर आज देय हैं", "due today")}</span><span className="mt-0.5 block text-xs text-amber-900/75">{t("सुनिश्चित करें कि हर बंडल तैयार है", "Confirm each bundle is ready")}</span></span>
              </span>
              <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-amber-800" />
            </button>
          )}
        </section>
      )}

      <section aria-label="Order summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, note, icon: Icon, filter }, index) => (
          <button className="group rounded-2xl border border-line bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-sea/40 hover:shadow-[0_12px_30px_-22px_rgba(23,40,42,0.5)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sea sm:p-5 cursor-pointer" key={label} onClick={() => onNavigateToOrders(filter)} type="button">
            <span className={`grid size-10 place-items-center rounded-xl ${index === 3 ? "bg-sea/10 text-sea" : "bg-sand text-ink-muted"}`}><Icon aria-hidden="true" className="size-5" /></span>
            <span className="mt-4 block text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{value ?? "—"}</span>
            <span className="mt-1 block text-sm font-medium text-ink">{label}</span>
            <span className="mt-1 block text-xs leading-5 text-ink-muted">{note}</span>
          </button>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(250px,0.8fr)]">
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-ink">{t("हाल के ऑर्डर्स", "Recent orders")}</h2>
              <p className="mt-1 text-xs text-ink-muted">{t("आपकी दुकान की नवीनतम गतिविधि", "Latest activity across your shop")}</p>
            </div>
            <button className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-sea transition hover:bg-sea/5 focus-visible:outline-2 focus-visible:outline-sea cursor-pointer" onClick={() => onNavigateToOrders("ALL")} type="button">
              {t("सभी देखें", "View all")} <ArrowRight aria-hidden="true" className="size-3.5" />
            </button>
          </div>

          {recentOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <span className="grid size-12 place-items-center rounded-2xl bg-sand text-ink-muted"><Shirt aria-hidden="true" className="size-6" /></span>
              <p className="mt-4 text-sm font-semibold text-ink">{t("अभी कोई ऑर्डर नहीं है", "No orders yet")}</p>
              <p className="mt-1 text-xs text-ink-muted">{t("पहला ऑर्डर शुरू करने के लिए 'नया ऑर्डर' पर क्लिक करें।", "Click 'New order' to log your first intake.")}</p>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {recentOrders.slice(0, 6).map((order) => (
                <div
                  key={order.id}
                  onClick={() => onSelectOrder(order.id)}
                  className="flex items-center justify-between gap-4 px-5 py-3.5 sm:px-6 hover:bg-slate-50 transition cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{order.orderNumber}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusStyles[order.status] || "bg-slate-100"}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {order.customerName} • <span className="font-mono">{order.customerMobile}</span> • {order.expectedQuantity} {t("कपड़े", "pcs")}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-semibold text-slate-700 block">
                      {formatDate(order.expectedDeliveryDate)}
                    </span>
                    <span className="text-[10px] text-slate-400">{t("डिलीवरी लक्ष्य", "Target delivery")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Help & Shortcuts Card */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-line bg-white p-5 space-y-3">
            <h3 className="font-bold text-sm text-slate-900">{t("त्वरित शॉर्टकट", "Quick Shortcuts")}</h3>
            <div className="space-y-2 text-xs">
              <button
                onClick={onOpenCustomerSearch}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer font-semibold text-slate-700"
              >
                <span className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-sea" />
                  <span>{t("ग्राहक खोजें / इतिहास देखें", "Find Customer & Records")}</span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
              <button
                onClick={onOpenQrScanner}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer font-semibold text-slate-700"
              >
                <span className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-purple-600" />
                  <span>{t("QR बंडल स्कैनर खोलें", "Open Bundle QR Scanner")}</span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
