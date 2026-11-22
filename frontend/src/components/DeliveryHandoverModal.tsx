"use client";

import React, { useState } from "react";
import { OrderDto } from "@/lib/types";
import { useLanguage } from "@/lib/LanguageContext";
import {
  X,
  Truck,
  CheckCircle2,
  AlertTriangle,
  PackageCheck,
} from "lucide-react";

interface DeliveryHandoverModalProps {
  isOpen: boolean;
  order: OrderDto | null;
  onClose: () => void;
  onDeliveryConfirmed: (orderId: string) => void;
}

export const DeliveryHandoverModal: React.FC<DeliveryHandoverModalProps> = ({
  isOpen,
  order,
  onClose,
  onDeliveryConfirmed,
}) => {
  const { t } = useLanguage();
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const handleDeliver = async () => {
    if (!confirmed) {
      setErrorMessage(t("कृपया ग्राहक को कपड़े सौंपने की पुष्टि करें।", "Please confirm physical handover of garments to the customer."));
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/orders/${order.id}/deliver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handoverConfirmed: true }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || t("ऑर्डर डिलीवर चिह्नित करने में विफल", "Failed to mark order as delivered"));
        setIsSubmitting(false);
        return;
      }

      onDeliveryConfirmed(order.id);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : t("नेटवर्क त्रुटि", "Network error"));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-emerald-50">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                {t("कपड़े सुपुर्दगी", "Garment Handover")}
              </h2>
              <p className="text-xs text-slate-500">
                {t("ऑर्डर", "Order")}: <strong className="text-slate-800">{order.orderNumber}</strong> ({order.customerName})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 bg-red-50 text-red-800 rounded-lg border border-red-200">
              {errorMessage}
            </div>
          )}

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">{t("ग्राहक", "Customer")}:</span>
              <strong className="text-slate-900">{order.customerName}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t("मोबाइल", "Mobile")}:</span>
              <strong className="text-slate-900 font-mono">{order.customerMobile}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t("कुल कपड़े", "Total Garments")}:</span>
              <strong className="text-emerald-800 text-sm font-black font-mono">
                {order.expectedQuantity} {t("कपड़े", "Pcs")}
              </strong>
            </div>
          </div>

          <p className="text-slate-600 text-[11px] leading-relaxed">
            {t(
              "दुकानदार द्वारा कपड़े ग्राहक को भौतिक रूप से सौंपने के बाद ही 'डिलीवर' चिह्नित करें। डिलीवर होने के बाद ऑर्डर स्वतः बंद हो जाएगा।",
              "Mark 'Deliver' only after physically handing over all garments to the customer. Once delivered, the order workflow will be archived with timestamps."
            )}
          </p>

          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
            <label className="flex items-start space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-800 leading-snug">
                {t(
                  `"मैंने ग्राहक को सभी ${order.expectedQuantity} कपड़े भौतिक रूप से सौंप दिए हैं।"`,
                  `"I have physically verified and handed over all ${order.expectedQuantity} garments to the customer."`
                )}
              </span>
            </label>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              {t("रद्द करें", "Cancel")}
            </button>

            <button
              type="button"
              onClick={handleDeliver}
              disabled={isSubmitting || !confirmed}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? t("सुरक्षित हो रहा है...", "Saving...") : t("✓ डिलीवर चिह्नित करें", "✓ Confirm Delivery")}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
