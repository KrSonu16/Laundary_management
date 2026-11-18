"use client";

import React, { useState, useEffect } from "react";
import { OrderDto, UserRole } from "@/lib/types";
import {
  X,
  Calendar,
  Phone,
  PackageCheck,
  QrCode,
  Truck,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Printer,
  Ban,
  Shield,
  Send,
  Eye,
} from "lucide-react";

interface OrderDetailsModalProps {
  isOpen: boolean;
  orderId: string | null;
  currentUserRole?: UserRole;
  onClose: () => void;
  onOpenQuantityVerification: (orderId: string) => void;
  onOpenQrSticker: (orderId: string) => void;
  onOpenDuplicateReceipt: (orderId: string) => void;
  onOpenDeliverModal: (order: OrderDto) => void;
  onOrderUpdated: () => void;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  isOpen,
  orderId,
  currentUserRole,
  onClose,
  onOpenQuantityVerification,
  onOpenQrSticker,
  onOpenDuplicateReceipt,
  onOpenDeliverModal,
  onOrderUpdated,
}) => {
  const [order, setOrder] = useState<OrderDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && orderId) {
      setIsLoading(true);
      fetch(`/api/orders/${orderId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.order) {
            setOrder(data.order);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    } else {
      setOrder(null);
    }
  }, [isOpen, orderId]);

  if (!isOpen) return null;

  const handleCancelOrder = async () => {
    if (!order || !cancelReason.trim()) return;
    setIsCancelling(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/orders/${order.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to cancel order");
        setIsCancelling(false);
        return;
      }

      onOrderUpdated();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error cancelling order");
      setIsCancelling(false);
    }
  };

  const getStepState = (targetStatus: string) => {
    const sequence = ["RECEIVED", "PROCESSING", "QUANTITY_PENDING", "QR_GENERATED", "READY", "DELIVERED"];
    if (!order) return "pending";
    if (order.status === "CANCELLED") return "cancelled";

    const currentIndex = sequence.indexOf(order.status);
    const targetIndex = sequence.indexOf(targetStatus);

    if (currentIndex >= targetIndex) return "completed";
    if (currentIndex + 1 === targetIndex) return "current";
    return "pending";
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 font-mono">
                {order?.orderNumber || "ऑर्डर विवरण / Order Details"}
              </h2>
              {order?.slipNumber && (
                <span className="text-xs bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-mono font-bold">
                  रसीद: {order.slipNumber}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              ग्राहक: <strong className="text-slate-800">{order?.customerName}</strong> ({order?.customerMobile})
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500">
              ऑर्डर विवरण लोड हो रहा है... / Loading details...
            </div>
          ) : order ? (
            <>
              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-800 rounded-lg border border-red-200">
                  {errorMsg}
                </div>
              )}

              {/* Status Stepper */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  ऑर्डर जीवन चक्र / Order Lifecycle Progress:
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-[10px]">
                  {[
                    { key: "RECEIVED", label: "1. प्राप्त / Recv" },
                    { key: "PROCESSING", label: "2. प्रोसेस / Proc" },
                    { key: "QUANTITY_PENDING", label: "3. जाँच / Qty" },
                    { key: "QR_GENERATED", label: "4. QR / Gen" },
                    { key: "READY", label: "5. तैयार / Ready" },
                    { key: "DELIVERED", label: "6. डिलीवर / Done" },
                  ].map((s) => {
                    const state = getStepState(s.key);
                    return (
                      <div
                        key={s.key}
                        className={`p-1.5 rounded-lg border font-bold ${
                          state === "completed"
                            ? "bg-blue-600 text-white border-blue-700"
                            : state === "current"
                            ? "bg-amber-100 text-amber-900 border-amber-300 ring-2 ring-amber-400/30"
                            : "bg-white text-slate-400 border-slate-200"
                        }`}
                      >
                        {s.label}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Order Info & Delivery Timeline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[11px]">अपेक्षित कुल कपड़े / Expected Qty:</span>
                  <strong className="text-base font-black text-slate-900">
                    {order.expectedQuantity} कपड़े / Pcs
                  </strong>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">
                    अपेक्षित डिलीवरी तारीख / Target Delivery:
                  </span>
                  <strong className="text-sm font-bold text-blue-700">
                    {new Date(order.expectedDeliveryDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </strong>
                </div>

                {order.isQuantityVerified && (
                  <div className="col-span-1 sm:col-span-2 pt-1 border-t border-slate-200 flex items-center justify-between text-emerald-800">
                    <span className="flex items-center space-x-1 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>कपड़ों की भौतिक जाँच पूर्ण (Verified: {order.actualQuantity}/{order.expectedQuantity})</span>
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {order.verifiedAt ? new Date(order.verifiedAt).toLocaleTimeString("en-IN") : ""}
                    </span>
                  </div>
                )}
              </div>

              {/* Garment Line Items Breakdown */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-3 py-2 font-bold text-slate-700 flex justify-between">
                  <span>कपड़ों का विवरण / Garment Line Items ({order.garments?.length || 0})</span>
                  <span>कुल: {order.expectedQuantity} नग</span>
                </div>
                <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto">
                  {order.garments?.map((g, idx) => (
                    <div key={idx} className="p-2.5 bg-white flex justify-between">
                      <div>
                        <span className="font-bold text-slate-900">
                          {g.hindiName} ({g.englishName})
                        </span>
                        {g.notes && <p className="text-[11px] text-slate-400">{g.notes}</p>}
                      </div>
                      <span className="font-bold text-slate-800 font-mono">{g.quantity} नग</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Special Instructions */}
              {order.specialInstructions && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-900">
                  <span className="font-bold block mb-0.5">विशेष निर्देश / Special Instructions:</span>
                  <p className="text-[11px]">{order.specialInstructions}</p>
                </div>
              )}

              {/* QR Code and Slip Photo Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Active QR Card */}
                <div className="border border-slate-200 p-3 rounded-xl bg-slate-50 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-700 block">बंडल QR कोड / Order QR:</span>
                    {order.activeQrCode ? (
                      <div className="space-y-1 mt-1">
                        <span className="font-mono font-bold text-xs text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                          {order.activeQrCode.tokenDisplayPrefix}
                        </span>
                        <p className="text-[10px] text-slate-400">सक्रिय लेबल / Active Label</p>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs">जाँच के बाद जनरेट होगा</span>
                    )}
                  </div>

                  {order.activeQrCode?.qrDataUrl && (
                    <button
                      onClick={() => onOpenQrSticker(order.id)}
                      className="p-1.5 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer shadow-2xs"
                    >
                      <img src={order.activeQrCode.qrDataUrl} alt="QR" className="w-14 h-14" />
                    </button>
                  )}
                </div>

                {/* Slip Photograph Reference */}
                <div className="border border-slate-200 p-3 rounded-xl bg-slate-50 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-700 block">हस्तलिखित रसीद फोटो / Slip Photo:</span>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {order.slipImageUrl ? "डिजिटल संदर्भ सुरक्षित है" : "कोई फोटो उपलब्ध नहीं"}
                    </p>
                  </div>

                  {order.slipImageUrl && (
                    <a
                      href={order.slipImageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-14 h-14 rounded-lg border border-slate-300 overflow-hidden bg-white flex items-center justify-center shrink-0 hover:opacity-80 transition"
                    >
                      <img src={order.slipImageUrl} alt="Slip" className="w-full h-full object-cover" />
                    </a>
                  )}
                </div>
              </div>

              {/* WhatsApp Notification Log */}
              {order.lastNotification && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between font-bold text-emerald-900">
                    <span className="flex items-center space-x-1">
                      <Send className="w-3.5 h-3.5 text-emerald-600" />
                      <span>व्हाट्सएप सूचना / WhatsApp Status: {order.lastNotification.status}</span>
                    </span>
                    <span className="text-[11px] text-emerald-700 font-mono">
                      {new Date(order.lastNotification.sentAt).toLocaleTimeString("en-IN")}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800 font-sans">
                    भेजी गई सूचना: &quot;नमस्ते {order.customerName} Ji, आपका Laundry Order {order.orderNumber} तैयार है...&quot;
                  </p>
                </div>
              )}

              {/* Cancel Order Section */}
              {showCancelPrompt && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2">
                  <span className="font-bold text-red-900 block">ऑर्डर रद्द करने का कारण दर्ज करें:</span>
                  <input
                    type="text"
                    placeholder="उदा. ग्राहक ने कपड़े वापस ले लिए"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-red-300 bg-white text-xs"
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setShowCancelPrompt(false)}
                      className="px-3 py-1 text-slate-600 cursor-pointer"
                    >
                      रद्द न करें
                    </button>
                    <button
                      onClick={handleCancelOrder}
                      disabled={isCancelling || !cancelReason.trim()}
                      className="px-3 py-1 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 cursor-pointer disabled:opacity-50"
                    >
                      {isCancelling ? "रद्द हो रहा है..." : "पुष्टि करें / Cancel Order"}
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onOpenDuplicateReceipt(order.id)}
                    className="px-3 py-2 rounded-xl bg-slate-100 text-slate-800 hover:bg-slate-200 font-bold text-xs transition cursor-pointer flex items-center space-x-1.5"
                  >
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>डुप्लीकेट रसीद / Duplicate Receipt</span>
                  </button>

                  {!["DELIVERED", "CANCELLED"].includes(order.status) && (
                    <button
                      onClick={() => setShowCancelPrompt(true)}
                      className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer"
                      title="ऑर्डर रद्द करें / Cancel Order"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {/* Step 1 action: Verify Quantity */}
                  {order.status === "QUANTITY_PENDING" && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenQuantityVerification(order.id);
                      }}
                      className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition cursor-pointer flex items-center space-x-1.5 shadow-xs"
                    >
                      <PackageCheck className="w-4 h-4" />
                      <span>कपड़ों की जाँच करें / Verify Quantity</span>
                    </button>
                  )}

                  {/* Step 2 action: Print QR Sticker */}
                  {order.activeQrCode && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenQrSticker(order.id);
                      }}
                      className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 transition cursor-pointer flex items-center space-x-1.5 shadow-xs"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>QR स्टीकर / Print QR</span>
                    </button>
                  )}

                  {/* Step 3 action: Mark Delivered */}
                  {order.status === "READY" && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenDeliverModal(order);
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition cursor-pointer flex items-center space-x-1.5 shadow-xs"
                    >
                      <Truck className="w-4 h-4" />
                      <span>डिलीवर करें / Deliver Order</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
