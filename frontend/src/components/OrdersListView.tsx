"use client";

import React, { useState, useEffect } from "react";
import { OrderDto, OrderStatus } from "@/lib/types";
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  PackageCheck,
  QrCode,
  Truck,
  AlertTriangle,
  FileText,
  ArrowRight,
  ShieldAlert,
  Calendar,
} from "lucide-react";

interface OrdersListViewProps {
  initialStatusFilter?: string;
  onSelectOrder: (orderId: string) => void;
  onOpenQuantityVerification: (orderId: string) => void;
  onOpenQrSticker: (orderId: string) => void;
  onOpenDuplicateReceipt: (orderId: string) => void;
  onOpenDeliverModal: (order: OrderDto) => void;
}

export const OrdersListView: React.FC<OrdersListViewProps> = ({
  initialStatusFilter = "ALL",
  onSelectOrder,
  onOpenQuantityVerification,
  onOpenQrSticker,
  onOpenDuplicateReceipt,
  onOpenDeliverModal,
}) => {
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setStatusFilter(initialStatusFilter);
  }, [initialStatusFilter]);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const url = new URL("/api/orders", window.location.origin);
      if (statusFilter && statusFilter !== "ALL") {
        url.searchParams.set("status", statusFilter);
      }
      if (searchQuery) {
        url.searchParams.set("search", searchQuery);
      }

      const res = await fetch(url.toString());
      const data = await res.json();
      setOrders(data.orders || []);
    } catch {
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, searchQuery]);

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "RECEIVED":
        return {
          label: "प्राप्त / RECEIVED",
          bg: "bg-blue-100 text-blue-800 border-blue-200",
        };
      case "PROCESSING":
        return {
          label: "प्रोसेसिंग / PROCESSING",
          bg: "bg-sky-100 text-sky-800 border-sky-200",
        };
      case "QUANTITY_PENDING":
        return {
          label: "जाँच बाकी / QTY PENDING",
          bg: "bg-amber-100 text-amber-800 border-amber-300",
        };
      case "QR_GENERATED":
        return {
          label: "QR तैयार / QR GENERATED",
          bg: "bg-purple-100 text-purple-800 border-purple-200",
        };
      case "READY":
        return {
          label: "पिकअप हेतु तैयार / READY",
          bg: "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold",
        };
      case "DELIVERED":
        return {
          label: "डिलीवर / DELIVERED",
          bg: "bg-slate-100 text-slate-800 border-slate-200",
        };
      case "CANCELLED":
        return {
          label: "रद्द / CANCELLED",
          bg: "bg-red-100 text-red-800 border-red-200",
        };
      default:
        return { label: status, bg: "bg-slate-100 text-slate-800 border-slate-200" };
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="ऑर्डर नंबर, मोबाइल नंबर, ग्राहक नाम या रसीद नंबर से खोजें..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          </div>

          <span className="text-xs text-slate-500 font-semibold self-end sm:self-auto">
            कुल: {orders.length} ऑर्डर
          </span>
        </div>

        {/* Status Filters Pill Row */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pb-1 text-xs font-semibold">
          {[
            { id: "ALL", label: "सभी / All" },
            { id: "QUANTITY_PENDING", label: "जाँच बाकी / Qty Pending" },
            { id: "QR_GENERATED", label: "QR तैयार / QR Generated" },
            { id: "READY", label: "तैयार / Ready" },
            { id: "DUE_TODAY", label: "आज देय / Due Today" },
            { id: "OVERDUE", label: "विलंबित / Overdue" },
            { id: "DELIVERED", label: "डिलीवर / Delivered" },
            { id: "CANCELLED", label: "रद्द / Cancelled" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List / Cards */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
          ऑर्डर लोड हो रहे हैं... / Loading orders...
        </div>
      ) : orders.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200 space-y-2">
          <p>कोई ऑर्डर नहीं मिला / No orders found matching the filter</p>
          {statusFilter !== "ALL" && (
            <button
              onClick={() => setStatusFilter("ALL")}
              className="text-blue-600 font-bold underline cursor-pointer"
            >
              सभी ऑर्डर देखें / View All Orders
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const badge = getStatusBadge(order.status);
            const deliveryDate = new Date(order.expectedDeliveryDate).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs hover:border-blue-300 transition space-y-3"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-base text-slate-900">
                      {order.orderNumber}
                    </span>
                    {order.slipNumber && (
                      <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-mono">
                        रसीद: {order.slipNumber}
                      </span>
                    )}
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-bold ${badge.bg}`}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Delivery date badge */}
                  <div className="flex items-center space-x-1.5 text-xs">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-500">डिलीवरी / Delivery:</span>
                    <span
                      className={`font-bold ${
                        order.deliveryAlert?.level === "OVERDUE"
                          ? "text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200"
                          : order.deliveryAlert?.level === "DUE_TODAY"
                          ? "text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200"
                          : "text-slate-900"
                      }`}
                    >
                      {deliveryDate}
                      {order.deliveryAlert?.level === "OVERDUE" && " (Overdue!)"}
                      {order.deliveryAlert?.level === "DUE_TODAY" && " (Due Today)"}
                    </span>
                  </div>
                </div>

                {/* Customer and Garments row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 gap-2 bg-slate-50 p-3 rounded-xl">
                  <div>
                    <span className="font-bold text-slate-900">{order.customerName}</span>
                    <span className="text-slate-400 font-mono ml-2">{order.customerMobile}</span>
                  </div>

                  <div className="flex items-center space-x-4">
                    <span>
                      अपेक्षित कपड़े / Expected:{" "}
                      <strong className="text-slate-900 font-mono">{order.expectedQuantity} नग</strong>
                    </span>
                    {order.isQuantityVerified && (
                      <span className="text-emerald-700 font-semibold flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>जाँच पूर्ण / Verified</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions row */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onSelectOrder(order.id)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1 cursor-pointer"
                    >
                      <span>विवरण देखें / View Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Action 1: If QUANTITY_PENDING -> Verify Quantity button */}
                    {order.status === "QUANTITY_PENDING" && (
                      <button
                        onClick={() => onOpenQuantityVerification(order.id)}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition cursor-pointer flex items-center space-x-1"
                      >
                        <PackageCheck className="w-3.5 h-3.5" />
                        <span>कपड़ों की जाँच करें / Verify</span>
                      </button>
                    )}

                    {/* Action 2: If QR_GENERATED -> Print/View QR button */}
                    {order.status === "QR_GENERATED" && (
                      <button
                        onClick={() => onOpenQrSticker(order.id)}
                        className="px-3 py-1.5 rounded-lg bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 transition cursor-pointer flex items-center space-x-1"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>QR स्टीकर / Print QR</span>
                      </button>
                    )}

                    {/* Action 3: If READY -> Mark Delivered button */}
                    {order.status === "READY" && (
                      <button
                        onClick={() => onOpenDeliverModal(order)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition cursor-pointer flex items-center space-x-1 shadow-xs"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>डिलीवर करें / Deliver</span>
                      </button>
                    )}

                    {/* Duplicate Receipt */}
                    <button
                      onClick={() => onOpenDuplicateReceipt(order.id)}
                      title="डुप्लीकेट रसीद प्रिंट करें / Print Duplicate Receipt"
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold transition cursor-pointer flex items-center space-x-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">रसीद / Receipt</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
