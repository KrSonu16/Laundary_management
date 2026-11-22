"use client";

import React, { useState } from "react";
import { OrderDto, UserRole } from "@/lib/types";
import { useLanguage } from "@/lib/LanguageContext";
import {
  X,
  PackageCheck,
  AlertTriangle,
  CheckCircle2,
  Shield,
  QrCode,
  ArrowRight,
} from "lucide-react";

interface QuantityVerificationModalProps {
  isOpen: boolean;
  order: OrderDto | null;
  currentUserRole?: UserRole;
  onClose: () => void;
  onVerifiedSuccess: (orderId: string) => void;
  onGenerateQrDirectly: (orderId: string) => void;
}

export const QuantityVerificationModal: React.FC<QuantityVerificationModalProps> = ({
  isOpen,
  order,
  currentUserRole,
  onClose,
  onVerifiedSuccess,
  onGenerateQrDirectly,
}) => {
  const { t } = useLanguage();
  const [actualQty, setActualQty] = useState<number>(order?.expectedQuantity || 1);
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mismatchError, setMismatchError] = useState<{
    expected: number;
    actual: number;
    difference: number;
  } | null>(null);

  // Owner override modal state
  const [showOverrideForm, setShowOverrideForm] = useState<boolean>(false);
  const [overrideReason, setOverrideReason] = useState<string>("");

  if (!isOpen || !order) return null;

  const handleVerify = async (isOverride: boolean = false) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setMismatchError(null);

    try {
      const res = await fetch(`/api/orders/${order.id}/verify-quantity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actualQuantity: actualQty,
          confirmed,
          isOwnerOverride: isOverride,
          overrideReason,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.mismatch) {
          setMismatchError({
            expected: data.expectedQuantity,
            actual: data.actualQuantity,
            difference: data.difference,
          });
        }
        setErrorMessage(data.error || t("सत्यापन विफल", "Verification failed"));
        setIsSubmitting(false);
        return;
      }

      onVerifiedSuccess(order.id);
      onGenerateQrDirectly(order.id);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : t("मात्रा सत्यापन में त्रुटि", "Error verifying quantity"));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-amber-50/50">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                {t("कपड़ों की भौतिक जाँच", "Garment Quantity Check")}
              </h2>
              <p className="text-xs text-slate-500">
                {t("ऑर्डर", "Order")}: <strong className="text-slate-800">{order.orderNumber}</strong> ({order.customerName})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {/* Expected Quantity Card */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
            <div>
              <span className="text-slate-500 font-bold block mb-1">
                {t("अपेक्षित कपड़े", "Expected Garments")}:
              </span>
              <p className="text-2xl font-black text-blue-700 font-mono">
                {order.expectedQuantity}
              </p>
              <span className="text-[10px] text-slate-400">
                {t("रसीद अनुसार", "From Slip")}
              </span>
            </div>

            <div>
              <span className="text-slate-700 font-bold block mb-1">
                {t("जाँची गई संख्या", "Checked Count")}:
              </span>
              <div className="flex items-center justify-center space-x-1">
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={actualQty}
                  onChange={(e) => setActualQty(parseInt(e.target.value, 10) || 0)}
                  className="w-20 py-1.5 px-2 text-center text-xl font-black text-slate-900 border-2 border-blue-500 rounded-lg bg-white"
                />
              </div>
              <span className="text-[10px] text-slate-400">
                {t("भौतिक गिनती", "Physical Count")}
              </span>
            </div>
          </div>

          {/* Garment Breakdown Reference */}
          {order.garments && order.garments.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-3 py-1.5 font-bold text-slate-700 text-[11px]">
                {t("कपड़ों की सूची", "Garments to physically check")}:
              </div>
              <div className="divide-y divide-slate-100 max-h-32 overflow-y-auto">
                {order.garments.map((g, idx) => (
                  <div key={idx} className="p-2 bg-white flex justify-between text-xs">
                    <span className="text-slate-800">
                      {g.hindiName} ({g.englishName})
                    </span>
                    <span className="font-bold text-slate-900 font-mono">
                      {g.quantity} {t("नग", "Pcs")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quantity Mismatch Warning Banner */}
          {mismatchError && (
            <div className="p-3.5 bg-red-50 border-l-4 border-red-600 rounded-r text-red-900 space-y-2">
              <div className="flex items-center space-x-2 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{t("मात्रा मेल नहीं खा रही!", "Quantity Mismatch Detected!")}</span>
              </div>
              <p className="text-[11px] text-red-700 leading-relaxed">
                {t(
                  `अपेक्षित संख्या ${mismatchError.expected} है, परंतु आपने ${mismatchError.actual} गिने हैं (अंतर: ${mismatchError.difference} कपड़े)। QR कोड जनरेशन अवरुद्ध है।`,
                  `Expected count is ${mismatchError.expected}, but physical count is ${mismatchError.actual} (difference: ${mismatchError.difference} pcs). QR Generation blocked.`
                )}
              </p>

              {/* Owner Override trigger */}
              <div className="pt-1">
                <button
                  onClick={() => setShowOverrideForm(!showOverrideForm)}
                  className="text-xs font-bold text-red-800 underline hover:text-red-900 cursor-pointer flex items-center space-x-1"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>{t("दुकान मालिक/एडमिन द्वारा सुधार अधिकृत करें", "Owner Authorization Override")}</span>
                </button>
              </div>
            </div>
          )}

          {/* Owner Override Form */}
          {showOverrideForm && (
            <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl space-y-2">
              <div className="flex items-center space-x-1.5 font-bold text-purple-900 text-xs">
                <Shield className="w-4 h-4 text-purple-600" />
                <span>{t("मालिक द्वारा असाधारण मात्रा सुधार", "Owner Override")}</span>
              </div>
              <p className="text-[11px] text-purple-700">
                {t(
                  "यदि ग्राहक ने कम/ज़्यादा कपड़े दिए थे, तो कारण दर्ज करें। यह ऑडिट लॉग में सुरक्षित रहेगा।",
                  "If customer provided different garment count, enter the reason. This will be stored in audit logs."
                )}
              </p>

              <div>
                <label className="block text-[11px] font-bold text-purple-900 mb-1">
                  {t("सुधार का अनिवार्य कारण *", "Reason for correction *")}:
                </label>
                <input
                  type="text"
                  placeholder={t("उदा. ग्राहक ने पर्ची पर 10 लिखा था पर 9 ही दिए", "e.g. Customer wrote 10 on slip but gave 9")}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-purple-300 bg-white text-xs"
                />
              </div>

              <button
                type="button"
                onClick={() => handleVerify(true)}
                disabled={isSubmitting || !overrideReason.trim()}
                className="w-full py-2 rounded-lg bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 transition cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? t("सत्यापित हो रहा है...", "Verifying...") : t("मालिक अधिकृति से QR जनरेट करें", "Authorize & Continue")}
              </button>
            </div>
          )}

          {/* Explicit Confirmation Checkbox */}
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
            <label className="flex items-start space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-800 leading-snug">
                {t(
                  "\"मैंने सभी कपड़ों की मैन्युअल जाँच कर ली है और कुल संख्या सत्यापित की है।\"",
                  "\"I have manually checked all garments and verified the total quantity.\""
                )}
              </span>
            </label>
          </div>

          {/* Action Buttons */}
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
              onClick={() => handleVerify(false)}
              disabled={isSubmitting || !confirmed}
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center space-x-1.5"
            >
              <QrCode className="w-4 h-4" />
              <span>{t("सत्यापित करें और QR जनरेट करें", "Verify & Generate QR")}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
