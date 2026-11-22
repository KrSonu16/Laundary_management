"use client";

import { useState } from "react";
import useSWR from "swr";
import type { CustomerDto, DashboardSummary, OrderDto, StaffUserDto } from "@/lib/types";
import { useLanguage } from "@/lib/LanguageContext";
import { Navbar } from "@/components/Navbar";
import { DashboardView } from "@/components/DashboardView";
import { OrdersListView } from "@/components/OrdersListView";
import { CustomerSearchView } from "@/components/CustomerSearchView";
import { DeliveryAlertsView } from "@/components/DeliveryAlertsView";
import { SettingsModal } from "@/components/SettingsModal";
import { NewOrderModal } from "@/components/NewOrderModal";
import { OrderDetailsModal } from "@/components/OrderDetailsModal";
import { QuantityVerificationModal } from "@/components/QuantityVerificationModal";
import { QrStickerModal } from "@/components/QrStickerModal";
import { QrScannerModal } from "@/components/QrScannerModal";
import { DuplicateReceiptModal } from "@/components/DuplicateReceiptModal";
import { DeliveryHandoverModal } from "@/components/DeliveryHandoverModal";
import { LoginModal } from "@/components/LoginModal";

interface AuthPayload {
  authenticated: boolean;
  user: StaffUserDto | null;
}

interface DashboardPayload {
  summary: DashboardSummary;
  orders: OrderDto[];
  alertsCount: number;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error("Request failed");
  return payload as T;
}

async function fetchDashboard(): Promise<DashboardPayload> {
  const [summaryData, orderData, alertData] = await Promise.all([
    fetchJson<{ summary: DashboardSummary }>("/api/dashboard/summary"),
    fetchJson<{ orders: OrderDto[] }>("/api/orders?status=ALL"),
    fetchJson<{
      alerts: {
        overdue?: { count?: number };
        dueToday?: { count?: number };
        urgent?: { count?: number };
      };
    }>("/api/dashboard/alerts"),
  ]);

  return {
    summary: summaryData.summary,
    orders: orderData.orders,
    alertsCount:
      (alertData.alerts.overdue?.count || 0) +
      (alertData.alerts.dueToday?.count || 0) +
      (alertData.alerts.urgent?.count || 0),
  };
}

export default function Home() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [preselectedCustomer, setPreselectedCustomer] = useState<CustomerDto | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);
  const [verifyOrderId, setVerifyOrderId] = useState<string | null>(null);
  const [verifyOrderObj, setVerifyOrderObj] = useState<OrderDto | null>(null);
  const [qrStickerOrderId, setQrStickerOrderId] = useState<string | null>(null);
  const [qrStickerOrderObj, setQrStickerOrderObj] = useState<OrderDto | null>(null);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [duplicateReceiptOrderId, setDuplicateReceiptOrderId] = useState<string | null>(null);
  const [deliverOrderObj, setDeliverOrderObj] = useState<OrderDto | null>(null);

  const {
    data: authData,
    isLoading: isAuthLoading,
    mutate: mutateAuth,
  } = useSWR<AuthPayload>("/api/auth/me", fetchJson, { revalidateOnFocus: false });
  const currentUser = authData?.authenticated ? authData.user : null;
  const {
    data: dashboardData,
    mutate: mutateDashboard,
  } = useSWR(currentUser ? "/api/dashboard/overview" : null, fetchDashboard, {
    revalidateOnFocus: true,
  });
  const refreshDashboardData = () => {
    void mutateDashboard();
  };

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      await mutateAuth({ authenticated: false, user: null }, { revalidate: false });
      setActiveTab("dashboard");
    }
  }

  async function handleOpenQuantityVerification(orderId: string) {
    try {
      const response = await fetchJson<{ order: OrderDto }>(`/api/orders/${encodeURIComponent(orderId)}`);
      setVerifyOrderObj(response.order);
      setVerifyOrderId(orderId);
    } catch {
      return;
    }
  }

  async function handleOpenQrSticker(orderId: string) {
    try {
      const response = await fetchJson<{ order: OrderDto }>(`/api/orders/${encodeURIComponent(orderId)}`);
      setQrStickerOrderObj(response.order);
      setQrStickerOrderId(orderId);
    } catch {
      return;
    }
  }

  async function handleGenerateQrDirectly(orderId: string) {
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/generate-qr`, { method: "POST" });
      if (response.ok) {
        refreshDashboardData();
        await handleOpenQrSticker(orderId);
      }
    } catch {
      return;
    }
  }

  if (isAuthLoading) {
    return (
      <main aria-busy="true" className="grid min-h-screen place-items-center bg-linen px-5">
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-white px-5 py-4 shadow-sm">
          <span aria-hidden="true" className="size-5 animate-spin rounded-full border-2 border-sea/20 border-t-sea motion-reduce:animate-none" />
          <p className="text-sm font-medium text-ink">{t("वर्कस्पेस खुल रहा है…", "Opening your workspace…")}</p>
        </div>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <LoginModal
        onLoginSuccess={(user) => {
          void mutateAuth({ authenticated: true, user }, { revalidate: false });
        }}
      />
    );
  }

  const openNewOrder = (customer: CustomerDto | null = null) => {
    setPreselectedCustomer(customer);
    setIsNewOrderOpen(true);
  };

  return (
    <div className="min-h-screen bg-linen">
      <Navbar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab === "orders") setStatusFilter("ALL");
        }}
        onOpenNewOrder={() => openNewOrder()}
        onOpenQrScanner={() => setIsQrScannerOpen(true)}
        onOpenCustomerSearch={() => setActiveTab("customers")}
        onLogout={handleLogout}
        onOpenSettings={() => setActiveTab("settings")}
        alertsCount={dashboardData?.alertsCount || 0}
      />

      <main className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
        {activeTab === "dashboard" && (
          <DashboardView
            summary={dashboardData?.summary || null}
            recentOrders={dashboardData?.orders || []}
            userRole={currentUser.role}
            onOpenNewOrder={() => openNewOrder()}
            onOpenCustomerSearch={() => setActiveTab("customers")}
            onOpenQrScanner={() => setIsQrScannerOpen(true)}
            onSelectOrder={(orderId) => {
              setSelectedOrderId(orderId);
              setIsOrderDetailsOpen(true);
            }}
            onNavigateToOrders={(filter) => {
              setStatusFilter(filter || "ALL");
              setActiveTab("orders");
            }}
            onNavigateToAlerts={() => setActiveTab("alerts")}
          />
        )}

        {activeTab === "orders" && (
          <OrdersListView
            initialStatusFilter={statusFilter}
            onSelectOrder={(orderId) => {
              setSelectedOrderId(orderId);
              setIsOrderDetailsOpen(true);
            }}
            onOpenQuantityVerification={handleOpenQuantityVerification}
            onOpenQrSticker={handleOpenQrSticker}
            onOpenDuplicateReceipt={(orderId) => setDuplicateReceiptOrderId(orderId)}
            onOpenDeliverModal={(order) => setDeliverOrderObj(order)}
          />
        )}

        {activeTab === "customers" && (
          <CustomerSearchView
            onStartOrderForCustomer={(customer) => openNewOrder(customer)}
            onSelectOrder={(orderId) => {
              setSelectedOrderId(orderId);
              setIsOrderDetailsOpen(true);
            }}
          />
        )}

        {activeTab === "alerts" && (
          <DeliveryAlertsView
            onSelectOrder={(orderId) => {
              setSelectedOrderId(orderId);
              setIsOrderDetailsOpen(true);
            }}
          />
        )}

        {activeTab === "settings" && <SettingsModal />}
      </main>

      <NewOrderModal
        isOpen={isNewOrderOpen}
        onClose={() => setIsNewOrderOpen(false)}
        preselectedCustomer={preselectedCustomer}
        onOrderCreated={(newId) => {
          refreshDashboardData();
          setSelectedOrderId(newId);
          setIsOrderDetailsOpen(true);
        }}
      />
      <OrderDetailsModal
        isOpen={isOrderDetailsOpen}
        orderId={selectedOrderId}
        currentUserRole={currentUser.role}
        onClose={() => setIsOrderDetailsOpen(false)}
        onOpenQuantityVerification={handleOpenQuantityVerification}
        onOpenQrSticker={handleOpenQrSticker}
        onOpenDuplicateReceipt={(orderId) => setDuplicateReceiptOrderId(orderId)}
        onOpenDeliverModal={(order) => setDeliverOrderObj(order)}
        onOrderUpdated={refreshDashboardData}
      />
      <QuantityVerificationModal
        isOpen={Boolean(verifyOrderId && verifyOrderObj)}
        order={verifyOrderObj}
        currentUserRole={currentUser.role}
        onClose={() => {
          setVerifyOrderId(null);
          setVerifyOrderObj(null);
        }}
        onVerifiedSuccess={refreshDashboardData}
        onGenerateQrDirectly={handleGenerateQrDirectly}
      />
      <QrStickerModal
        isOpen={Boolean(qrStickerOrderId && qrStickerOrderObj)}
        order={qrStickerOrderObj}
        onClose={() => {
          setQrStickerOrderId(null);
          setQrStickerOrderObj(null);
        }}
        onQrRegenerated={refreshDashboardData}
      />
      <QrScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        onScanSuccess={refreshDashboardData}
      />
      <DuplicateReceiptModal
        isOpen={Boolean(duplicateReceiptOrderId)}
        orderId={duplicateReceiptOrderId}
        onClose={() => setDuplicateReceiptOrderId(null)}
      />
      <DeliveryHandoverModal
        isOpen={Boolean(deliverOrderObj)}
        order={deliverOrderObj}
        onClose={() => setDeliverOrderObj(null)}
        onDeliveryConfirmed={refreshDashboardData}
      />
    </div>
  );
}
