"use client";

import React, { useState } from "react";
import { OrderDto } from "@/lib/types";
import { useLanguage } from "@/lib/LanguageContext";
import { useShop } from "@/lib/ShopContext";
import {
  X,
  Printer,
  Download,
  RotateCcw,
  QrCode,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

interface QrStickerModalProps {
  isOpen: boolean;
  order: OrderDto | null;
  onClose: () => void;
  onQrRegenerated?: () => void;
}

export const QrStickerModal: React.FC<QrStickerModalProps> = ({
  isOpen,
  order,
  onClose,
  onQrRegenerated,
}) => {
  const { t } = useLanguage();
  const { shopName, settings } = useShop();
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateSuccess, setRegenerateSuccess] = useState(false);

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!order.activeQrCode?.qrDataUrl) return;
    const a = document.createElement("a");
    a.href = order.activeQrCode.qrDataUrl;
    a.download = `QR_${order.orderNumber}_Sticker.png`;
    a.click();
  };

  const handleRegenerate = async () => {
    if (!confirm(t("क्या आप पुराना QR रद्द करके नया स्टीकर जारी करना चाहते हैं?", "Invalidate old QR and generate replacement?"))) {
      return;
    }

    setIsRegenerating(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/regenerate-qr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Label damaged or lost" }),
      });

      if (res.ok) {
        setRegenerateSuccess(true);
        if (onQrRegenerated) onQrRegenerated();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRegenerating(false);
    }
  };

  const deliveryDate = new Date(order.expectedDeliveryDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const shopPhone = settings.SHOP_PHONE || "0124-4200100";
  const shopAddress = settings.SHOP_ADDRESS || "Shop operations";

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-purple-50">
          <div className="flex items-center space-x-2">
            <QrCode className="w-5 h-5 text-purple-600" />
            <div>
              <h2 className="text-sm font-black text-slate-900">
                {t("ऑर्डर QR स्टीकर", "Order QR Label")}
              </h2>
              <p className="text-[11px] text-slate-500">
                {t("ऑर्डर", "Order")}: <strong className="text-slate-800">{order.orderNumber}</strong>
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

        {/* Printable Thermal Label Sticker Body (50x50mm / 2x2 inch design) */}
        <div className="p-5 flex flex-col items-center">
          <div
            id="thermal-sticker-print"
            className="w-64 p-4 bg-white border-2 border-slate-900 rounded-xl shadow-xs text-center space-y-2 font-mono"
          >
            {/* Shop Brand Header */}
            <div className="border-b-2 border-slate-900 pb-1.5">
              <h3 className="font-extrabold text-sm tracking-tight text-slate-900 uppercase">
                {shopName}
              </h3>
              <p className="text-[10px] text-slate-600">{shopAddress} • Ph: {shopPhone}</p>
            </div>

            {/* Order Number & Item Count */}
            <div className="flex items-center justify-between text-xs font-bold pt-1">
              <span className="text-sm font-black">{order.orderNumber}</span>
              <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-900 text-xs">
                {order.expectedQuantity} {t("कपड़े", "Pcs")}
              </span>
            </div>

            {/* High-Contrast QR Code */}
            <div className="py-1 flex justify-center">
              {order.activeQrCode?.qrDataUrl ? (
                <img
                  src={order.activeQrCode.qrDataUrl}
                  alt={`QR for ${order.orderNumber}`}
                  className="w-40 h-40 border border-slate-200 p-1 rounded"
                />
              ) : (
                <div className="w-40 h-40 bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                  {t("QR तैयार हो रहा है", "QR Pending")}
                </div>
              )}
            </div>

            {/* Token Display Prefix & Delivery Target */}
            <div className="border-t-2 border-slate-900 pt-1.5 space-y-0.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">{t("लेबल आईडी", "Label ID")}:</span>
                <span className="font-bold text-slate-900 font-mono">
                  {order.activeQrCode?.tokenDisplayPrefix || "QR-XXXX"}
                </span>
              </div>
              <div className="flex justify-between font-bold text-slate-900">
                <span>{t("डिलीवरी तारीख", "Due Date")}:</span>
                <span>{deliveryDate}</span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 text-center mt-3">
            {t(
              "यह स्टीकर कपड़े के बंडल पर चिपकाएँ। कार्यशाला स्टाफ कैमरा से स्कैन करके स्थिति को 'तैयार' करेगा।",
              "Stick this label on the garment bundle. Workshop staff scans this QR to mark garments READY."
            )}
          </p>

          {/* Action Buttons */}
          <div className="w-full grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={handlePrint}
              className="py-2.5 px-3 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition cursor-pointer flex items-center justify-center space-x-1.5 shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>{t("प्रिंट करें", "Print")}</span>
            </button>

            <button
              onClick={handleDownload}
              className="py-2.5 px-3 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-bold text-xs transition cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <Download className="w-4 h-4" />
              <span>{t("डाउनलोड", "Save")}</span>
            </button>

            <button
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="col-span-2 py-2 text-[11px] font-semibold text-slate-500 hover:text-red-600 transition cursor-pointer flex items-center justify-center space-x-1 mt-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{t("स्टीकर खराब/खो गया? नया स्टीकर जनरेट करें", "Label damaged/lost? Regenerate QR")}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
