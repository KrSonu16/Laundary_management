"use client";

import React, { useState, useEffect } from "react";
import type { StaffUserDto, GarmentTypeDto, UserRole } from "@/lib/types";
import { useLanguage } from "@/lib/LanguageContext";
import { useShop } from "@/lib/ShopContext";
import {
  Settings,
  Shield,
  Phone,
  Store,
  Layers,
  Users,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RefreshCw,
  Clock,
  Sparkles,
  Send,
  Trash2,
} from "lucide-react";

export const SettingsModal: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<"general" | "whatsapp" | "staff" | "garments" | "audit">("general");

  // Shop Settings
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Staff Management
  const [staffList, setStaffList] = useState<StaffUserDto[]>([]);
  const [staffToDelete, setStaffToDelete] = useState<StaffUserDto | null>(null);
  const [isDeletingStaff, setIsDeletingStaff] = useState(false);

  const { t } = useLanguage();
  const { refreshSettings } = useShop();

  async function handleDeleteStaff() {
    if (!staffToDelete) return;
    setIsDeletingStaff(true);
    setStaffActionError("");
    setStaffActionMessage("");

    try {
      const response = await fetch(`/api/staff?staffId=${encodeURIComponent(staffToDelete.id)}`, {
        method: "DELETE",
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setStaffActionError(result?.error || "Failed to delete staff member");
        return;
      }

      setStaffActionMessage(`स्टाफ खाता "${staffToDelete.name}" डेटाबेस से सफलतापूर्वक डिलीट कर दिया गया।`);
      setStaffToDelete(null);
      await refreshStaffList();
    } catch {
      setStaffActionError("Could not reach the staff service. Please try again.");
    } finally {
      setIsDeletingStaff(false);
    }
  }
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffMobile, setNewStaffMobile] = useState("");
  const [newStaffRole, setNewStaffRole] = useState<UserRole>("SHOPKEEPER");
  const [newStaffPassword, setNewStaffPassword] = useState("");
  const [staffAccessDrafts, setStaffAccessDrafts] = useState<Record<string, { role: UserRole; isActive: boolean }>>({});
  const [staffActionError, setStaffActionError] = useState("");
  const [staffActionMessage, setStaffActionMessage] = useState("");
  const [busyStaffId, setBusyStaffId] = useState("");
  const [isCreatingStaff, setIsCreatingStaff] = useState(false);

  // Garment Catalogue
  const [garments, setGarments] = useState<GarmentTypeDto[]>([]);
  const [showAddGarment, setShowAddGarment] = useState(false);
  const [newHindiName, setNewHindiName] = useState("");
  const [newEnglishName, setNewEnglishName] = useState("");
  const [newCategory, setNewCategory] = useState("Men");

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // WhatsApp Logs
  const [notifications, setNotifications] = useState<any[]>([]);

  async function refreshStaffList() {
    const response = await fetch("/api/staff");
    const data = await response.json().catch(() => null);
    if (response.ok && Array.isArray(data?.staff)) {
      const nextStaff = data.staff as StaffUserDto[];
      setStaffList(nextStaff);
      setStaffAccessDrafts(
        Object.fromEntries(nextStaff.map((staff) => [staff.id, { role: staff.role, isActive: staff.isActive }]))
      );
    }
  }

  // Fetch settings on mount
  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) setSettings(data.settings);
      });

    void refreshStaffList();

    fetch("/api/garments")
      .then((res) => res.json())
      .then((data) => {
        if (data.garments) setGarments(data.garments);
      });

    fetch("/api/audit-logs")
      .then((res) => res.json())
      .then((data) => {
        if (data.logs) setAuditLogs(data.logs);
      });

    fetch("/api/notifications")
      .then((res) => res.json())
      .then((data) => {
        if (data.notifications) setNotifications(data.notifications);
      });
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        await refreshSettings();
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffActionError("");
    setStaffActionMessage("");
    setIsCreatingStaff(true);

    try {
      const response = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newStaffName,
          email: newStaffEmail,
          mobile: newStaffMobile,
          role: newStaffRole,
          password: newStaffPassword,
        }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setStaffActionError(result?.error || "Staff account could not be created.");
        return;
      }

      setShowAddStaff(false);
      setNewStaffName("");
      setNewStaffEmail("");
      setNewStaffMobile("");
      setNewStaffPassword("");
      setStaffActionMessage("Staff account created. Share the sign-in details privately.");
      await refreshStaffList();
    } catch {
      setStaffActionError("Could not reach the staff service. Please try again.");
    } finally {
      setIsCreatingStaff(false);
    }
  };

  const handleSaveStaffAccess = async (staffId: string) => {
    const draft = staffAccessDrafts[staffId];
    if (!draft) return;

    setStaffActionError("");
    setStaffActionMessage("");
    setBusyStaffId(staffId);

    try {
      const response = await fetch("/api/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId, role: draft.role, isActive: draft.isActive }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setStaffActionError(result?.error || "Staff access could not be updated.");
        return;
      }

      setStaffActionMessage("Staff permissions saved. Disabled accounts can no longer sign in.");
      await refreshStaffList();
    } catch {
      setStaffActionError("Could not reach the staff service. Please try again.");
    } finally {
      setBusyStaffId("");
    }
  };

  const handleCreateGarment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/garments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hindiName: newHindiName,
          englishName: newEnglishName,
          category: newCategory,
        }),
      });

      if (res.ok) {
        setShowAddGarment(false);
        setNewHindiName("");
        setNewEnglishName("");
        // Reload catalogue
        fetch("/api/garments")
          .then((r) => r.json())
          .then((d) => d.garments && setGarments(d.garments));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Settings Navigation Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center space-x-2">
            <Settings className="w-5 h-5 text-purple-600" />
            <span>{t("दुकान मालिक सेटिंग्स", "Owner Settings & Administration")}</span>
          </h2>
          <p className="text-xs text-slate-500">
            {t(
              "दुकान का विवरण, व्हाट्सएप क्लाउड API, स्टाफ खाते, परिधान सूची और ऑडिट लॉग्स प्रबंधित करें।",
              "Manage shop details, WhatsApp Cloud API, staff credentials, garment catalog, and audit logs."
            )}
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveSubTab("general")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${activeSubTab === "general" ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
          >
            {t("दुकान", "Shop Details")}
          </button>
          <button
            onClick={() => setActiveSubTab("whatsapp")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${activeSubTab === "whatsapp" ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
          >
            {t("व्हाट्सएप API", "WhatsApp API")}
          </button>
          <button
            onClick={() => setActiveSubTab("staff")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${activeSubTab === "staff" ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
          >
            {t("स्टाफ प्रबंधन", "Staff Accounts")}
          </button>
          <button
            onClick={() => setActiveSubTab("garments")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${activeSubTab === "garments" ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
          >
            {t("परिधान सूची", "Garments Catalog")}
          </button>
          <button
            onClick={() => setActiveSubTab("audit")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${activeSubTab === "audit" ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
          >
            {t("ऑडिट लॉग्स", "Audit Logs")}
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{t("सेटिंग्स सफलतापूर्वक सुरक्षित की गईं!", "Settings saved successfully!")}</span>
        </div>
      )}

      {/* SUBTAB 1: GENERAL SHOP DETAILS */}
      {activeSubTab === "general" && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4 text-xs">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            {t("दुकान का मूल विवरण", "General Shop Information")}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t("दुकान का नाम", "Shop Name")}</label>
              <input
                type="text"
                placeholder={t("जैसे: डीसी स्मार्ट लांड्री", "e.g. DC Smart Laundry")}
                value={settings.SHOP_NAME || ""}
                onChange={(e) => setSettings({ ...settings, SHOP_NAME: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{t("टैगलाइन", "Shop Tagline")}</label>
              <input
                type="text"
                placeholder={t("जैसे: प्रीमियम ड्राई क्लीनिंग सेवा", "e.g. Premium Dry Cleaning & Ironing")}
                value={settings.SHOP_TAGLINE || ""}
                onChange={(e) => setSettings({ ...settings, SHOP_TAGLINE: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{t("आधिकारिक फोन नंबर", "Official Phone Number")}</label>
              <input
                type="text"
                placeholder="0124-4200100 / 9876543210"
                value={settings.SHOP_PHONE || ""}
                onChange={(e) => setSettings({ ...settings, SHOP_PHONE: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{t("दुकान का भौतिक पता", "Physical Address")}</label>
              <input
                type="text"
                placeholder={t("दुकान संख्या, मार्केट, शहर", "Shop No, Market, City")}
                value={settings.SHOP_ADDRESS || ""}
                onChange={(e) => setSettings({ ...settings, SHOP_ADDRESS: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? t("सुरक्षित हो रहा है...", "Saving...") : t("सेटिंग्स सुरक्षित करें", "Save Settings")}
            </button>
          </div>
        </form>
      )}

      {/* SUBTAB 2: WHATSAPP CLOUD API CONFIGURATION */}
      {activeSubTab === "whatsapp" && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4 text-xs">
          <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {t("आधिकारिक WhatsApp Cloud API एकीकरण", "Official Meta WhatsApp Cloud API")}
              </h3>
              <p className="text-[11px] text-slate-500">
                {t(
                  "Meta Cloud API क्रेडेंशियल्स जोड़ें। कपड़े रेडी होने पर ऑटो-मैसेज जाएगा।",
                  "Connect your Meta Cloud API to automatically notify customers when garments are ready."
                )}
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-200">
              {t("मोड", "Mode")}: {settings.WHATSAPP_MODE || "SIMULATION"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {t("WhatsApp सेवा सक्रिय रखें", "WhatsApp Service Status")}
              </label>
              <select
                value={settings.WHATSAPP_ENABLED || "true"}
                onChange={(e) => setSettings({ ...settings, WHATSAPP_ENABLED: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold"
              >
                <option value="true">{t("सक्रिय", "Enabled")}</option>
                <option value="false">{t("निष्क्रिय", "Disabled")}</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {t("संचालन मोड", "API Mode")}
              </label>
              <select
                value={settings.WHATSAPP_MODE || "SIMULATION"}
                onChange={(e) => setSettings({ ...settings, WHATSAPP_MODE: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold"
              >
                <option value="SIMULATION">{t("सिमुलेशन मोड (डेमो टेस्टिंग)", "Simulation Mode (Local Demo)")}</option>
                <option value="LIVE">{t("लाइव मोड (Meta Graph Cloud API)", "Live Mode (Meta Graph API)")}</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Phone Number ID (Meta Graph API)
              </label>
              <input
                type="text"
                placeholder="उदा. 104829102938102"
                value={settings.WHATSAPP_PHONE_NUMBER_ID || ""}
                onChange={(e) => setSettings({ ...settings, WHATSAPP_PHONE_NUMBER_ID: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {t("टेंपलेट नाम", "Approved Template Name")}
              </label>
              <input
                type="text"
                placeholder="order_ready_hi"
                value={settings.WHATSAPP_TEMPLATE_NAME || "order_ready_hi"}
                onChange={(e) => setSettings({ ...settings, WHATSAPP_TEMPLATE_NAME: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                {t("सिस्टम यूज़र एक्सेस टोकन (स्थायी Meta Cloud API)", "System User Access Token (Permanent / Meta Cloud API)")}
              </label>
              <input
                type="password"
                placeholder="EAAGxxxxxxxxxxxxxxxxxxxxxxxx"
                value={settings.WHATSAPP_ACCESS_TOKEN || ""}
                onChange={(e) => setSettings({ ...settings, WHATSAPP_ACCESS_TOKEN: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? t("सुरक्षित हो रहा है...", "Saving...") : t("WhatsApp सेटिंग्स सुरक्षित करें", "Save WhatsApp Config")}
            </button>
          </div>

          {/* Outbound WhatsApp Notification Logs */}
          <div className="pt-4 border-t border-slate-100">
            <h4 className="font-bold text-slate-900 mb-2">
              {t("हाल के व्हाट्सएप नोटिफिकेशन लॉग्स", "Recent Notification History")} ({notifications.length}):
            </h4>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
              {notifications.map((notif) => (
                <div key={notif.id} className="p-3 bg-white flex items-center justify-between text-[11px]">
                  <div>
                    <span className="font-bold text-slate-900">{notif.orderNumber}</span> •{" "}
                    <span className="text-slate-600">{notif.customerName}</span> (
                    <span className="font-mono text-slate-500">{notif.recipientMobile}</span>)
                    <p className="text-slate-400 mt-0.5 line-clamp-1">{notif.messageBody}</p>
                  </div>
                  <div className="text-right">
                    <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                      {notif.status}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(notif.sentAt).toLocaleTimeString("en-IN")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>
      )}

      {/* SUBTAB 3: STAFF MANAGEMENT */}
      {activeSubTab === "staff" && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t("स्टाफ खाते", "Staff Accounts & Access")}</h3>
              <p className="text-slate-500">
                {t(
                  "Owner के पास पूरा access है। Shopkeeper ऑर्डर बनाता है; Workshop QR स्कैन करता है।",
                  "Owner has full access. Shopkeeper handles orders/delivery. Workshop handles bundle scanning."
                )}
              </p>
            </div>
            <button
              onClick={() => setShowAddStaff(!showAddStaff)}
              className="px-3.5 py-1.5 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-700 cursor-pointer"
            >
              + {t("नया स्टाफ जोड़ें", "Add Staff Member")}
            </button>
          </div>

          {staffActionError && <p aria-live="polite" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">{staffActionError}</p>}
          {staffActionMessage && <p aria-live="polite" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">{staffActionMessage}</p>}

          {showAddStaff && (
            <form onSubmit={handleCreateStaff} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-900">{t("नया स्टाफ विवरण दर्ज करें:", "Enter New Staff Details:")}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder={t("स्टाफ का नाम", "Staff Name")}
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                />
                <input
                  type="email"
                  required
                  placeholder={t("ईमेल (लॉगिन आईडी)", "Email (Login ID)")}
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                />
                <input
                  type="tel"
                  required
                  placeholder={t("मोबाइल नंबर", "Mobile Number")}
                  value={newStaffMobile}
                  onChange={(e) => setNewStaffMobile(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-mono"
                />
                <select
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value as UserRole)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-bold"
                >
                  <option value="SHOPKEEPER">{t("दुकानदार (ऑर्डर व डिलीवरी)", "Shopkeeper (Orders & Handover)")}</option>
                  <option value="WORKSHOP">{t("कार्यशाला (बंडल स्कैनिंग)", "Workshop (Bundle QR Scanning)")}</option>
                  <option value="ADMIN">{t("मालिक (पूर्ण अधिकार)", "Owner (Full Admin Access)")}</option>
                </select>
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={14}
                  maxLength={72}
                  required
                  placeholder={t("पासवर्ड (कम-से-कम 14 अक्षर)", "Password (Min 14 characters)")}
                  value={newStaffPassword}
                  onChange={(e) => setNewStaffPassword(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white sm:col-span-2"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddStaff(false)}
                  className="px-3 py-1 text-slate-600"
                >
                  {t("रद्द करें", "Cancel")}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-700"
                >
                  {t("खाता बनाएँ", "Create Account")}
                </button>
              </div>
            </form>
          )}

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {staffList.map((st) => {
              const draft = staffAccessDrafts[st.id] || { role: st.role, isActive: st.isActive };
              const isChanged = draft.role !== st.role || draft.isActive !== st.isActive;
              const isBusy = busyStaffId === st.id;

              return (
                <div key={st.id} className="p-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 text-sm">{st.name}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.role === "ADMIN"
                          ? "bg-purple-100 text-purple-800 border-purple-200"
                          : st.role === "SHOPKEEPER"
                            ? "bg-blue-100 text-blue-800 border-blue-200"
                            : "bg-amber-100 text-amber-800 border-amber-200"
                          }`}
                      >
                        {st.role === "ADMIN" ? "OWNER" : st.role}
                      </span>
                      {!st.isActive && (
                        <span className="text-[10px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded border border-red-200">
                          {t("खाता बंद", "Inactive")}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {st.email} • <span className="font-mono">{st.mobile}</span>
                    </p>
                  </div>

                  {/* Permissions & Status Controls */}
                  <div className="flex items-center space-x-2">
                    <select
                      value={draft.role}
                      onChange={(e) =>
                        setStaffAccessDrafts((prev) => ({
                          ...prev,
                          [st.id]: {
                            ...draft,
                            role: e.target.value as UserRole,
                          },
                        }))
                      }
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-slate-50 text-slate-800"
                    >
                      <option value="ADMIN">{t("मालिक", "Owner")}</option>
                      <option value="SHOPKEEPER">{t("दुकानदार", "Shopkeeper")}</option>
                      <option value="WORKSHOP">{t("कार्यशाला", "Workshop")}</option>
                    </select>

                    <select
                      value={draft.isActive ? "active" : "inactive"}
                      onChange={(e) =>
                        setStaffAccessDrafts((prev) => ({
                          ...prev,
                          [st.id]: {
                            ...draft,
                            isActive: e.target.value === "active",
                          },
                        }))
                      }
                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold ${draft.isActive
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : "bg-red-50 text-red-800 border-red-300"
                        }`}
                    >
                      <option value="active">{t("सक्रिय", "Active")}</option>
                      <option value="inactive">{t("निष्क्रिय", "Disabled")}</option>
                    </select>

                    {isChanged && (
                      <button
                        onClick={() => handleSaveStaffAccess(st.id)}
                        disabled={isBusy}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition cursor-pointer disabled:opacity-50"
                      >
                        {isBusy ? t("सेव...", "Saving...") : t("सेव करें", "Save")}
                      </button>
                    )}

                    {/* Delete Staff Icon Button */}
                    <button
                      type="button"
                      onClick={() => setStaffToDelete(st)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                      title={t("स्टाफ खाता डेटाबेस से डिलीट करें", "Delete Staff Member")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Delete Staff Confirmation Modal */}
          {staffToDelete && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 p-5 space-y-4">
                <div className="flex items-center space-x-3 text-red-600">
                  <div className="p-2 bg-red-100 rounded-xl">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-slate-900">
                      {t("स्टाफ खाता डिलीट करें?", "Delete Account?")}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {t("यह खाता स्थायी रूप से डेटाबेस से हट जाएगा।", "This account will be permanently removed.")}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
                  <p className="font-bold text-slate-900">{staffToDelete.name}</p>
                  <p className="text-slate-500">{staffToDelete.email} • {staffToDelete.mobile}</p>
                  <span className="inline-block mt-1 font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200">
                    Role: {staffToDelete.role}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {t(
                    "क्या आप वाकई इस स्टाफ सदस्य को हटाना चाहते हैं? इसके बाद यह स्टाफ लॉगिन नहीं कर पाएगा।",
                    "Are you sure you want to delete this staff member? They will no longer be able to log in."
                  )}
                </p>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setStaffToDelete(null)}
                    disabled={isDeletingStaff}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  >
                    {t("रद्द करें", "Cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteStaff}
                    disabled={isDeletingStaff}
                    className="px-4 py-1.5 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition cursor-pointer disabled:opacity-50 flex items-center space-x-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isDeletingStaff ? t("हटा रहे हैं...", "Deleting...") : t("हाँ, डिलीट करें", "Yes, Delete")}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 4: GARMENT CATALOGUE */}
      {activeSubTab === "garments" && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {t(`परिधान कैटलॉग (${garments.length})`, `Garments Catalogue (${garments.length})`)}
              </h3>
              <p className="text-slate-500">
                {t("हिंदी और अंग्रेजी नामों के साथ कपड़े।", "Predefined garment catalogue with Hindi & English names.")}
              </p>
            </div>
            <button
              onClick={() => setShowAddGarment(!showAddGarment)}
              className="px-3.5 py-1.5 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-700 cursor-pointer"
            >
              + {t("नया कपड़ा जोड़ें", "Add Garment")}
            </button>
          </div>

          {showAddGarment && (
            <form onSubmit={handleCreateGarment} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-900">{t("नया कपड़ा जोड़ें:", "Add New Garment:")}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  placeholder={t("हिंदी नाम (उदा. शेरवानी)", "Hindi Name (e.g. Sherwani)")}
                  value={newHindiName}
                  onChange={(e) => setNewHindiName(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                />
                <input
                  type="text"
                  required
                  placeholder={t("English Name (उदा. Sherwani)", "English Name (e.g. Sherwani)")}
                  value={newEnglishName}
                  onChange={(e) => setNewEnglishName(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                />
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="Men">{t("पुरुष (Men)", "Men")}</option>
                  <option value="Women">{t("महिला (Women)", "Women")}</option>
                  <option value="Casual">{t("कैजुअल (Casual)", "Casual")}</option>
                  <option value="Formal">{t("फॉर्मल (Formal)", "Formal")}</option>
                  <option value="Winter">{t("सर्दियों के (Winter)", "Winter")}</option>
                  <option value="Household">{t("घरेलू / चादर (Household)", "Household")}</option>
                </select>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddGarment(false)}
                  className="px-3 py-1 text-slate-600 cursor-pointer"
                >
                  {t("रद्द करें", "Cancel")}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-700 cursor-pointer"
                >
                  {t("कैटलॉग में जोड़ें", "Save Garment")}
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {garments.map((g) => (
              <div
                key={g.id}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-slate-900 block">{g.hindiName}</span>
                  <span className="text-[11px] text-slate-500">{g.englishName}</span>
                </div>
                <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600 font-medium">
                  {g.category}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 5: AUDIT LOGS */}
      {activeSubTab === "audit" && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4 text-xs">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">
              {t(`स्टाफ गतिविधि और ऑडिट ट्रेल्स (${auditLogs.length})`, `Staff Activity & Audit Logs (${auditLogs.length})`)}
            </h3>
            <p className="text-slate-500">
              {t(
                "ऑर्डर निर्माण, भौतिक मात्रा जाँच, QR जनरेशन, QR स्कैनिंग और डिलीवरी की पूरी ऑडिट ट्रेल।",
                "Full immutable audit trail of order creation, quantity checks, QR generation, scanning, and handovers."
              )}
            </p>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3 bg-white hover:bg-slate-50 transition flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 font-mono text-[11px] bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                      {log.action}
                    </span>
                    <span className="text-slate-700 font-semibold">{log.details}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {t("स्टाफ", "Staff")}: <strong>{log.staffName || "System"}</strong> ({log.staffRole || "Automated"}) • {t("इकाई", "Entity")}: {log.entityType}
                  </p>
                </div>

                <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2 font-mono">
                  {new Date(log.createdAt).toLocaleString("en-IN")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
