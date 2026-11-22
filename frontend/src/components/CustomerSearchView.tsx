"use client";

import React, { useState } from "react";
import { CustomerDto } from "@/lib/types";
import { useLanguage } from "@/lib/LanguageContext";
import {
  Search,
  UserPlus,
  Phone,
  MapPin,
  Clock,
  Layers,
  ArrowRight,
  PlusCircle,
  CheckCircle2,
  FileText,
} from "lucide-react";

interface CustomerSearchViewProps {
  onStartOrderForCustomer: (customer: CustomerDto) => void;
  onSelectOrder: (orderId: string) => void;
}

export const CustomerSearchView: React.FC<CustomerSearchViewProps> = ({
  onStartOrderForCustomer,
  onSelectOrder,
}) => {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState<(CustomerDto & {
    totalOrdersCount?: number;
    activeOrdersCount?: number;
    recentOrders?: {
      id: string;
      orderNumber: string;
      status: string;
      expectedQuantity: number;
      expectedDeliveryDate: string;
    }[];
  })[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // New Customer inline form
  const [showNewForm, setShowNewForm] = useState(false);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [alternateMobile, setAlternateMobile] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const handleSearch = async (val: string) => {
    setQuery(val);
    if (val.trim().length < 2) {
      setCustomers([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch(`/api/customers/search?q=${encodeURIComponent(val)}`);
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch {
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          mobile,
          alternateMobile,
          address,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || t("ग्राहक जोड़ने में विफल", "Failed to create customer"));
        return;
      }

      // Add to list and close form
      setCustomers([data.customer]);
      setShowNewForm(false);
      setName("");
      setMobile("");
      setAddress("");
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : t("ग्राहक जोड़ने में त्रुटि", "Error registering customer"));
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              {t("स्मार्ट ग्राहक खोज", "Smart Customer Search")}
            </h2>
            <p className="text-xs text-slate-500">
              {t(
                "ग्राहक का मोबाइल नंबर या नाम दर्ज करें। पुराना रिकॉर्ड व सक्रिय ऑर्डर तुरंत दिखाई देंगे।",
                "Enter customer mobile or name. Past records and active orders will appear instantly."
              )}
            </p>
          </div>

          <button
            onClick={() => setShowNewForm(!showNewForm)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition cursor-pointer self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ {t("नया ग्राहक", "New Customer")}</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            placeholder={t(
              "मोबाइल नंबर या नाम से खोजें (उदा. 9876543210 या राहुल)...",
              "Search by mobile number or name (e.g. 9876543210 or Rahul)..."
            )}
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition"
          />
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
        </div>
      </div>

      {/* New Customer Form */}
      {showNewForm && (
        <div className="bg-white rounded-2xl p-5 border border-blue-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-blue-900 flex items-center space-x-1.5">
            <UserPlus className="w-4 h-4 text-blue-600" />
            <span>{t("नया ग्राहक पंजीकरण", "Register New Customer")}</span>
          </h3>

          {formError && (
            <div className="p-3 bg-red-50 text-red-800 text-xs rounded-lg border border-red-200">
              {formError}
            </div>
          )}

          <form onSubmit={handleCreateCustomer} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t("पूरा नाम", "Full Name")} *
              </label>
              <input
                type="text"
                required
                placeholder={t("उदा. राहुल कुमार", "e.g. Rahul Kumar")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t("10 अंकों का मोबाइल नंबर", "10-Digit Mobile")} *
              </label>
              <input
                type="tel"
                required
                maxLength={10}
                placeholder="9876543210"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t("वैकल्पिक मोबाइल", "Alternate Mobile")}
              </label>
              <input
                type="tel"
                maxLength={10}
                placeholder={t("वैकल्पिक नंबर", "Alternate number")}
                value={alternateMobile}
                onChange={(e) => setAlternateMobile(e.target.value.replace(/\D/g, ""))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t("पता", "Address")}
              </label>
              <input
                type="text"
                placeholder={t("हाउस नंबर, सेक्टर, शहर", "House No., Sector, City")}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
              />
            </div>

            <div className="sm:col-span-2 flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewForm(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                {t("रद्द करें", "Cancel")}
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition cursor-pointer"
              >
                {t("ग्राहक सुरक्षित करें", "Save Customer")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Customer Results List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
            {t("खोज जारी है...", "Searching...")}
          </div>
        ) : customers.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {customers.map((cust) => (
              <div
                key={cust.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-blue-300 transition space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-slate-900 text-base">{cust.name}</h3>
                      <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-mono font-bold border border-blue-200">
                        {cust.mobile}
                      </span>
                      {cust.alternateMobile && (
                        <span className="text-[11px] text-slate-500 font-mono">
                          (Alt: {cust.alternateMobile})
                        </span>
                      )}
                    </div>
                    {cust.address && (
                      <p className="text-xs text-slate-500 flex items-center space-x-1 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{cust.address}</span>
                      </p>
                    )}
                  </div>

                  {/* Action: Create New Order for this customer */}
                  <button
                    onClick={() => onStartOrderForCustomer(cust)}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition cursor-pointer active:scale-95 shadow-xs self-start sm:self-auto"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>{t("नया ऑर्डर बनाएँ", "New Order")}</span>
                  </button>
                </div>

                {/* Customer Orders History */}
                {cust.recentOrders && cust.recentOrders.length > 0 && (
                  <div className="pt-3 border-t border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">
                      {t(`ग्राहक के हाल के ऑर्डर (${cust.recentOrders.length}):`, `Recent Orders (${cust.recentOrders.length}):`)}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {cust.recentOrders.map((ord) => (
                        <div
                          key={ord.id}
                          onClick={() => onSelectOrder(ord.id)}
                          className="p-2.5 bg-slate-50 hover:bg-blue-50 rounded-xl border border-slate-200 transition cursor-pointer flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900">{ord.orderNumber}</span>
                            <p className="text-[11px] text-slate-500">
                              {ord.expectedQuantity} {t("कपड़े", "pcs")} • {ord.status}
                            </p>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : hasSearched ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200 space-y-2">
            <p>{t(`कोई ग्राहक नहीं मिला "${query}"`, `No customers found matching "${query}"`)}</p>
            <button
              onClick={() => {
                setShowNewForm(true);
                setMobile(query.replace(/\D/g, ""));
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition cursor-pointer"
            >
              + {t("नया ग्राहक पंजीकृत करें", "Register New Customer")}
            </button>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
            {t("ऊपर मोबाइल नंबर लिखकर ग्राहक खोजें", "Type mobile number or name above to search customer records")}
          </div>
        )}
      </div>
    </div>
  );
};
