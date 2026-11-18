"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import {
  X,
  Printer,
  Download,
  FileText,
  Sparkles,
  ShieldCheck,
  Edit2,
  Check,
} from "lucide-react";

interface DuplicateReceiptModalProps {
  isOpen: boolean;
  orderId: string | null;
  onClose: () => void;
  onReceiptUpdated?: () => void;
}

export const DuplicateReceiptModal: React.FC<DuplicateReceiptModalProps> = ({
  isOpen,
  orderId,
  onClose,
  onReceiptUpdated,
}) => {
  const { t } = useLanguage();
  const [receipt, setReceipt] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editSlipNumber, setEditSlipNumber] = useState("");
  const [editInstructions, setEditInstructions] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    if (isOpen && orderId) {
      setIsLoading(true);
      fetch(`/api/orders/${orderId}/duplicate-receipt`, {
        method: "POST",
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.receipt) {
            setReceipt(data.receipt);
            setEditSlipNumber(data.receipt.slipNumber || "");
            setEditInstructions(data.receipt.specialInstructions || "");
          }
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    } else {
      setReceipt(null);
      setIsEditing(false);
    }
  }, [isOpen, orderId]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleSaveEdit = async () => {
    if (!orderId) return;
    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slipNumber: editSlipNumber.trim(),
          specialInstructions: editInstructions.trim(),
        }),
      });
      if (res.ok) {
        setReceipt((prev: any) => ({
          ...prev,
          slipNumber: editSlipNumber.trim(),
          specialInstructions: editInstructions.trim(),
        }));
        setIsEditing(false);
        if (onReceiptUpdated) onReceiptUpdated();
      }
    } catch (e) {
      console.error("Failed to update receipt details", e);
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
          {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-sm font-black text-slate-900">
                {t("रसीद / प्रति", "Receipt & Copy")}
              </h2>
              <p className="text-[11px] text-slate-500">
                {t("रसीद देखें, एडिट करें या प्रिंट करें", "View, edit slip details, or print duplicate")}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="p-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-200 transition cursor-pointer text-xs font-bold flex items-center space-x-1"
              title="पर्ची नंबर या निर्देश एडिट करें"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{isEditing ? t("कैंसिल", "Cancel") : t("एडिट", "Edit")}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Edit Receipt Slip Bar */}
        {isEditing && (
          <div className="p-4 bg-amber-50 border-b border-amber-200 text-xs space-y-2">
            <p className="font-bold text-amber-900 flex items-center space-x-1">
              <Edit2 className="w-3.5 h-3.5" />
              <span>{t("रसीद का पर्ची नंबर या विशेष निर्देश बदलें:", "Edit Slip Number / Special Instructions:")}</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder={t("पर्ची संख्या (Slip No.)", "Slip Number")}
                value={editSlipNumber}
                onChange={(e) => setEditSlipNumber(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white text-xs font-mono"
              />
              <input
                type="text"
                placeholder={t("विशेष निर्देश (Instructions)", "Special Instructions")}
                value={editInstructions}
                onChange={(e) => setEditInstructions(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white text-xs"
              />
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="px-3.5 py-1.5 rounded-lg bg-amber-700 text-white font-bold text-xs hover:bg-amber-800 transition cursor-pointer disabled:opacity-50 flex items-center space-x-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSavingEdit ? t("सेव हो रहा है...", "Saving...") : t("सेव करें", "Save Changes")}</span>
              </button>
            </div>
          </div>
        )}

        {/* Printable Receipt Paper Container */}
        <div className="p-5 overflow-y-auto max-h-[70vh]">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-500">
              रसीद तैयार हो रही है... / Generating duplicate receipt...
            </div>
          ) : receipt ? (
            <div
              id="printable-duplicate-receipt"
              className="p-6 bg-white border-2 border-slate-300 rounded-xl space-y-4 text-xs font-mono relative overflow-hidden shadow-xs"
            >
              {/* DUPLICATE COPY Watermark Stamp */}
              <div className="border-2 border-red-600 text-red-600 font-extrabold text-sm px-3 py-1 rounded text-center tracking-widest uppercase bg-red-50/50">
                ★ DUPLICATE COPY / द्वितीय प्रति (प्रति #{receipt.duplicateCopyNumber}) ★
              </div>

              {/* Shop Header */}
              <div className="text-center border-b border-slate-300 pb-3">
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  {receipt.shop.shopName}
                </h3>
                <p className="text-[11px] text-slate-600">{receipt.shop.shopTagline}</p>
                <p className="text-[10px] text-slate-500 mt-1">{receipt.shop.shopAddress}</p>
                <p className="text-[10px] text-slate-700 font-bold">फोन: {receipt.shop.shopPhone}</p>
              </div>

              {/* Order and Customer Details Grid */}
              <div className="grid grid-cols-2 gap-2 border-b border-slate-200 pb-3 text-[11px]">
                <div>
                  <span className="text-slate-400 block">ऑर्डर संख्या / Order No:</span>
                  <strong className="text-sm font-black text-slate-900">{receipt.orderNumber}</strong>
                </div>

                <div className="text-right">
                  <span className="text-slate-400 block">पर्ची संख्या / Slip No:</span>
                  <strong className="text-slate-800">{receipt.slipNumber || "लागू नहीं / N/A"}</strong>
                </div>

                <div>
                  <span className="text-slate-400 block">ग्राहक / Customer:</span>
                  <strong className="text-slate-900">{receipt.customerName}</strong>
                </div>

                <div className="text-right">
                  <span className="text-slate-400 block">मोबाइल / Mobile:</span>
                  <strong className="text-slate-900">{receipt.customerMobile}</strong>
                </div>

                <div>
                  <span className="text-slate-400 block">प्राप्त तारीख / Received:</span>
                  <span>{new Date(receipt.receivedDate).toLocaleDateString("en-IN")}</span>
                </div>

                <div className="text-right">
                  <span className="text-slate-400 block">डिलीवरी तारीख / Target:</span>
                  <strong className="text-blue-800">
                    {new Date(receipt.expectedDeliveryDate).toLocaleDateString("en-IN")}
                  </strong>
                </div>

                <div className="col-span-2 pt-1 flex justify-between items-center">
                  <span className="text-slate-400">वर्तमान स्थिति / Status:</span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-300 font-bold text-slate-800">
                    {receipt.status}
                  </span>
                </div>
              </div>

              {/* Garment Items Table */}
              <div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-300 text-[10px] font-bold text-slate-500 uppercase">
                      <th className="py-1">कपड़े का नाम / Garment</th>
                      <th className="py-1 text-right">संख्या / Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {receipt.garments?.map((g: any, i: number) => (
                      <tr key={i}>
                        <td className="py-1.5 text-slate-800">
                          {g.hindiName} ({g.englishName})
                          {g.notes && <span className="text-[10px] text-slate-400 block font-sans">{g.notes}</span>}
                        </td>
                        <td className="py-1.5 text-right font-bold text-slate-900">
                          {g.quantity} Pcs
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-900 font-bold text-slate-900">
                      <td className="py-2">कुल कपड़े / TOTAL GARMENTS:</td>
                      <td className="py-2 text-right text-sm font-black">
                        {receipt.expectedQuantity} नग
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* QR Code Reference if generated */}
              {receipt.qrDataUrl && (
                <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                  <div>
                    <span className="text-[10px] text-slate-400 block">बंडल QR कोड / Bundle QR:</span>
                    <strong className="text-xs text-slate-800">{receipt.qrPrefix}</strong>
                  </div>
                  <img
                    src={receipt.qrDataUrl}
                    alt="Receipt QR"
                    className="w-16 h-16 border border-slate-200 p-0.5 rounded"
                  />
                </div>
              )}

              {/* Notice & Signatures */}
              <div className="border-t border-slate-200 pt-2 text-[10px] text-slate-400 text-center space-y-1">
                <p>
                  नोट: यह एक डिजिटल संदर्भ प्रति है। कपड़े प्राप्त करते समय ऑर्डर नंबर या मोबाइल नंबर बताना अनिवार्य है।
                </p>
                <p className="text-slate-500">
                  जारीकर्ता: {receipt.printedBy} • प्रिंट समय: {new Date(receipt.printedAt).toLocaleTimeString("en-IN")}
                </p>
              </div>
            </div>
          ) : null}

          {/* Action Buttons */}
          <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-200">
            <button
              onClick={onClose}
              className="text-xs text-slate-500 font-semibold cursor-pointer"
            >
              बंद करें / Close
            </button>

            <button
              onClick={handlePrint}
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition cursor-pointer flex items-center space-x-1.5 shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>रसीद प्रिंट करें / Print Receipt</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
