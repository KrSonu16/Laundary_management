"use client";

import React, { useState, useEffect } from "react";
import { OrderDto } from "@/lib/types";
import { useLanguage } from "@/lib/LanguageContext";
import {
  Bell,
  Clock,
  ShieldAlert,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Package,
} from "lucide-react";

interface DeliveryAlertsViewProps {
  onSelectOrder: (orderId: string) => void;
}

export const DeliveryAlertsView: React.FC<DeliveryAlertsViewProps> = ({
  onSelectOrder,
}) => {
  const { t } = useLanguage();
  const [alerts, setAlerts] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    fetch("/api/dashboard/alerts")
      .then((res) => res.json())
      .then((data) => {
        if (data.alerts) setAlerts(data.alerts);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
            <Bell className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              {t("डिलीवरी अलर्ट केंद्र", "Delivery Alerts Center")}
            </h2>
            <p className="text-xs text-slate-500">
              {t(
                "अपेक्षित तारीख के अनुसार स्वचालित चेतावनी। विलंबित और आज देय ऑर्डर को तुरंत प्राथमिकता दें।",
                "Automated delivery date warnings. Prioritize overdue and due-today orders immediately."
              )}
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
          {t("अलर्ट लोड हो रहे हैं...", "Loading alerts...")}
        </div>
      ) : alerts ? (
        <div className="space-y-6">
          {/* 1. OVERDUE SECTION */}
          {alerts.overdue?.count > 0 && (
            <div className="bg-white rounded-2xl border-2 border-red-300 overflow-hidden shadow-xs">
              <div className="bg-red-600 text-white px-5 py-3 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShieldAlert className="w-5 h-5 animate-bounce" />
                  <span className="font-extrabold text-sm">
                    {t(`1. विलंबित ऑर्डर (${alerts.overdue.count})`, `1. Overdue Orders (${alerts.overdue.count})`)}
                  </span>
                </div>
                <span className="text-xs bg-red-800 text-white px-2 py-0.5 rounded font-bold uppercase">
                  {t("अति-महत्वपूर्ण", "Critical")}
                </span>
              </div>

              <div className="divide-y divide-slate-100 p-2">
                {alerts.overdue.orders.map((ord: any) => (
                  <div
                    key={ord.id}
                    onClick={() => onSelectOrder(ord.id)}
                    className="p-3.5 hover:bg-red-50/50 rounded-xl transition cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-slate-900 text-sm">{ord.orderNumber}</span>
                        {ord.slipNumber && (
                          <span className="text-[11px] bg-slate-100 px-1.5 py-0.2 rounded font-mono">
                            {t("रसीद", "Slip")}: {ord.slipNumber}
                          </span>
                        )}
                        <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded">
                          {t("स्थिति", "Status")}: {ord.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {ord.customerName} • <span className="font-mono">{ord.customerMobile}</span> •{" "}
                        <strong>{ord.expectedQuantity} {t("कपड़े", "pcs")}</strong>
                      </p>
                    </div>

                    <div className="flex items-center space-x-3 text-right">
                      <div>
                        <span className="text-xs font-bold text-red-700 block">
                          {t("देय तारीख", "Due Date")}: {new Date(ord.expectedDeliveryDate).toLocaleDateString("en-IN")}
                        </span>
                        <span className="text-[11px] text-slate-400">{t("तारीख बीत चुकी है", "Past deadline")}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-red-600" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. DUE TODAY SECTION */}
          {alerts.dueToday?.count > 0 && (
            <div className="bg-white rounded-2xl border-2 border-amber-300 overflow-hidden shadow-xs">
              <div className="bg-amber-600 text-white px-5 py-3 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5" />
                  <span className="font-extrabold text-sm">
                    {t(`2. आज देय (${alerts.dueToday.count})`, `2. Due Today (${alerts.dueToday.count})`)}
                  </span>
                </div>
                <span className="text-xs bg-amber-800 text-white px-2 py-0.5 rounded font-bold uppercase">
                  {t("आज ही डिलीवरी", "Due Today")}
                </span>
              </div>

              <div className="divide-y divide-slate-100 p-2">
                {alerts.dueToday.orders.map((ord: any) => (
                  <div
                    key={ord.id}
                    onClick={() => onSelectOrder(ord.id)}
                    className="p-3.5 hover:bg-amber-50/50 rounded-xl transition cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-slate-900 text-sm">{ord.orderNumber}</span>
                        <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                          {t("स्थिति", "Status")}: {ord.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {ord.customerName} • <span className="font-mono">{ord.customerMobile}</span> •{" "}
                        <strong>{ord.expectedQuantity} {t("कपड़े", "pcs")}</strong>
                      </p>
                    </div>

                    <div className="flex items-center space-x-3 text-right">
                      <div>
                        <span className="text-xs font-bold text-amber-800 block">{t("आज शाम तक देय", "Due by this evening")}</span>
                        <span className="text-[11px] text-slate-400">{t("ग्राहक आ सकता है", "Customer expected")}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-amber-600" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. URGENT (1 DAY LEFT) */}
          {alerts.urgent?.count > 0 && (
            <div className="bg-white rounded-2xl border border-orange-200 overflow-hidden shadow-xs">
              <div className="bg-orange-500 text-white px-5 py-3 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-extrabold text-sm">
                    {t(`3. कल देय (1 दिन शेष) (${alerts.urgent.count})`, `3. Urgent (1 Day Left) (${alerts.urgent.count})`)}
                  </span>
                </div>
              </div>

              <div className="divide-y divide-slate-100 p-2">
                {alerts.urgent.orders.map((ord: any) => (
                  <div
                    key={ord.id}
                    onClick={() => onSelectOrder(ord.id)}
                    className="p-3.5 hover:bg-orange-50/50 rounded-xl transition cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <span className="font-black text-slate-900 text-sm">{ord.orderNumber}</span>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {ord.customerName} • {ord.expectedQuantity} {t("कपड़े", "pcs")} • {t("स्थिति", "Status")}: {ord.status}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-orange-600" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. READY FOR PICKUP (WAITING FOR CUSTOMER) */}
          {alerts.pickupPending?.count > 0 && (
            <div className="bg-white rounded-2xl border border-emerald-200 overflow-hidden shadow-xs">
              <div className="bg-emerald-600 text-white px-5 py-3 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-extrabold text-sm">
                    {t(
                      `4. दुकान में तैयार - पिकअप प्रतीक्षारत (${alerts.pickupPending.count})`,
                      `4. Ready in Shop - Waiting Pickup (${alerts.pickupPending.count})`
                    )}
                  </span>
                </div>
                <span className="text-xs bg-emerald-800 text-white px-2 py-0.5 rounded font-bold">
                  {t("WhatsApp भेजा गया", "WhatsApp Sent")}
                </span>
              </div>

              <div className="divide-y divide-slate-100 p-2">
                {alerts.pickupPending.orders.map((ord: any) => (
                  <div
                    key={ord.id}
                    onClick={() => onSelectOrder(ord.id)}
                    className="p-3.5 hover:bg-emerald-50/50 rounded-xl transition cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-slate-900 text-sm">{ord.orderNumber}</span>
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                          {t("पूरी तरह तैयार", "Ready for Handover")}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {ord.customerName} • <span className="font-mono">{ord.customerMobile}</span> •{" "}
                        <strong>{ord.expectedQuantity} {t("कपड़े", "pcs")}</strong>
                      </p>
                    </div>

                    <div className="flex items-center space-x-3 text-right">
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                        {t("सुपुर्दगी करें →", "Handover →")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
