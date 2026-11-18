"use client";

import React, { useState, useEffect } from "react";
import { CustomerDto, GarmentTypeDto, OcrExtractionResult } from "@/lib/types";
import {
  X,
  Camera,
  Search,
  UserPlus,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Plus,
  Minus,
  Trash2,
  Sparkles,
  FileText,
  Upload,
  Layers,
  ArrowRight,
} from "lucide-react";

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (orderId: string) => void;
  preselectedCustomer?: CustomerDto | null;
}

export const NewOrderModal: React.FC<NewOrderModalProps> = ({
  isOpen,
  onClose,
  onOrderCreated,
  preselectedCustomer,
}) => {
  // Wizard steps: 1: Customer, 2: Slip & OCR, 3: Garments & Delivery, 4: Review
  const [step, setStep] = useState<number>(1);

  // Customer state
  const [mobileQuery, setMobileQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDto | null>(null);
  const [searchResults, setSearchResults] = useState<CustomerDto[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustMobile, setNewCustMobile] = useState("");
  const [newCustAddress, setNewCustAddress] = useState("");

  // Slip & OCR state
  const [slipNumber, setSlipNumber] = useState("");
  const [slipImageUrl, setSlipImageUrl] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [uncertainFields, setUncertainFields] = useState<string[]>([]);
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);

  // Garment catalogue & order line items
  const [catalogue, setCatalogue] = useState<GarmentTypeDto[]>([]);
  const [selectedGarments, setSelectedGarments] = useState<
    {
      garmentTypeId?: string;
      hindiName: string;
      englishName: string;
      quantity: number;
      notes?: string;
    }[]
  >([]);

  // Delivery & special instructions
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load catalogue on open
  useEffect(() => {
    if (isOpen) {
      fetch("/api/garments")
        .then((res) => res.json())
        .then((data) => {
          if (data.garments) {
            setCatalogue(data.garments.filter((g: GarmentTypeDto) => g.isActive));
          }
        })
        .catch(console.error);

      // Set default delivery date (+3 days from today)
      const d = new Date();
      d.setDate(d.getDate() + 3);
      setExpectedDeliveryDate(d.toISOString().split("T")[0]);

      if (preselectedCustomer) {
        setSelectedCustomer(preselectedCustomer);
        setStep(2);
      } else {
        setStep(1);
      }
    }
  }, [isOpen, preselectedCustomer]);

  // Smart Customer Search
  const handleSearchCustomer = async (query: string) => {
    setMobileQuery(query);
    if (query.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/customers/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSearchResults(data.customers || []);

      // If exact 10 digits and not found, suggest new registration
      if (query.replace(/\D/g, "").length === 10 && (!data.customers || data.customers.length === 0)) {
        setShowNewCustomerForm(true);
        setNewCustMobile(query.replace(/\D/g, ""));
      }
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Register New Customer
  const handleRegisterNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustMobile) return;

    setErrorMessage(null);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCustName,
          mobile: newCustMobile,
          address: newCustAddress,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.existingCustomer) {
          setSelectedCustomer(data.existingCustomer);
          setShowNewCustomerForm(false);
          setStep(2);
          return;
        }
        setErrorMessage(data.error || "Failed to register customer");
        return;
      }

      setSelectedCustomer(data.customer);
      setShowNewCustomerForm(false);
      setStep(2);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error creating customer");
    }
  };

  // Trigger OCR with sample slip or image
  const handleProcessOcr = async (params: { sampleId?: string; imageData?: string }) => {
    setOcrLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/ocr/slip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "OCR extraction failed");
        return;
      }

      const ext: OcrExtractionResult & { slipImageUrl?: string } = data.extraction;
      if (ext.slipNumber) setSlipNumber(ext.slipNumber);
      if (ext.slipImageUrl) setSlipImageUrl(ext.slipImageUrl);
      if (ext.expectedDeliveryDate) setExpectedDeliveryDate(ext.expectedDeliveryDate);
      setUncertainFields(ext.uncertainFields || []);
      setOcrConfidence(ext.confidenceOverall);

      // If customer was not selected yet and OCR found mobile number, search or match
      if (!selectedCustomer && ext.mobile) {
        const custRes = await fetch(`/api/customers/search?q=${ext.mobile}`);
        const custData = await custRes.json();
        if (custData.customers?.[0]) {
          setSelectedCustomer(custData.customers[0]);
        } else if (ext.customerName) {
          // Pre-fill new customer form
          setShowNewCustomerForm(true);
          setNewCustName(ext.customerName);
          setNewCustMobile(ext.mobile);
        }
      }

      // Populate extracted garments
      if (ext.garments && ext.garments.length > 0) {
        setSelectedGarments(
          ext.garments.map((g) => ({
            hindiName: g.hindiName,
            englishName: g.englishName,
            quantity: g.quantity,
          }))
        );
      }

      // Move to Step 3: Garments verification
      setStep(3);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "OCR failed");
    } finally {
      setOcrLoading(false);
    }
  };

  // Handle Photo upload from camera
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setSlipImageUrl(base64);
      handleProcessOcr({ imageData: base64 });
    };
    reader.readAsDataURL(file);
  };

  // Garment items add/update/remove
  const handleAddGarment = (item: GarmentTypeDto) => {
    setSelectedGarments((prev) => {
      const existing = prev.find((g) => g.englishName === item.englishName);
      if (existing) {
        return prev.map((g) =>
          g.englishName === item.englishName ? { ...g, quantity: g.quantity + 1 } : g
        );
      }
      return [
        ...prev,
        {
          garmentTypeId: item.id,
          hindiName: item.hindiName,
          englishName: item.englishName,
          quantity: 1,
        },
      ];
    });
  };

  const handleUpdateQty = (index: number, delta: number) => {
    setSelectedGarments((prev) => {
      const updated = [...prev];
      const newQty = updated[index].quantity + delta;
      if (newQty <= 0) {
        return updated.filter((_, i) => i !== index);
      }
      updated[index].quantity = newQty;
      return updated;
    });
  };

  const handleRemoveGarment = (index: number) => {
    setSelectedGarments((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculate Total Expected Quantity
  const totalExpectedQuantity = selectedGarments.reduce(
    (sum, item) => sum + (parseInt(item.quantity as unknown as string, 10) || 1),
    0
  );

  // Submit Order
  const handleSubmitOrder = async () => {
    if (!selectedCustomer) {
      setErrorMessage("Please select or register a customer first.");
      setStep(1);
      return;
    }

    if (selectedGarments.length === 0) {
      setErrorMessage("Please add at least one garment to the order.");
      setStep(3);
      return;
    }

    if (!expectedDeliveryDate) {
      setErrorMessage("Please select expected delivery date.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          slipNumber,
          slipImageUrl,
          expectedDeliveryDate,
          specialInstructions,
          garments: selectedGarments,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to create order");
        setIsSubmitting(false);
        return;
      }

      onOrderCreated(data.orderId);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Network error creating order");
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                +
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  नया लॉन्ड्री ऑर्डर / New Laundry Order
                </h2>
                <p className="text-xs text-slate-500">
                  चरण {step} / 4:{" "}
                  {step === 1 && "ग्राहक पहचान / Customer Identification"}
                  {step === 2 && "रसीद फोटो व OCR / Slip Photography & OCR"}
                  {step === 3 && "कपड़ों की संख्या व डिलीवरी / Garments & Delivery Date"}
                  {step === 4 && "समीक्षा और ऑर्डर सुरक्षित / Review & Save Order"}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Steps Progress Bar */}
        <div className="grid grid-cols-4 bg-slate-100 border-b border-slate-200 text-xs text-center font-semibold">
          <button
            onClick={() => setStep(1)}
            className={`py-2 border-r border-slate-200 cursor-pointer ${
              step === 1 ? "bg-blue-600 text-white" : step > 1 ? "bg-blue-50 text-blue-800" : "text-slate-500"
            }`}
          >
            1. ग्राहक / Customer
          </button>
          <button
            onClick={() => selectedCustomer && setStep(2)}
            disabled={!selectedCustomer}
            className={`py-2 border-r border-slate-200 cursor-pointer ${
              step === 2 ? "bg-blue-600 text-white" : step > 2 ? "bg-blue-50 text-blue-800" : "text-slate-400"
            }`}
          >
            2. रसीद / Slip OCR
          </button>
          <button
            onClick={() => selectedCustomer && setStep(3)}
            disabled={!selectedCustomer}
            className={`py-2 border-r border-slate-200 cursor-pointer ${
              step === 3 ? "bg-blue-600 text-white" : step > 3 ? "bg-blue-50 text-blue-800" : "text-slate-400"
            }`}
          >
            3. कपड़े / Garments
          </button>
          <button
            onClick={() => selectedCustomer && selectedGarments.length > 0 && setStep(4)}
            disabled={!selectedCustomer || selectedGarments.length === 0}
            className={`py-2 cursor-pointer ${
              step === 4 ? "bg-blue-600 text-white" : "text-slate-400"
            }`}
          >
            4. समीक्षा / Review
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="m-4 p-3 bg-red-50 border-l-4 border-red-600 text-red-800 text-xs rounded-r flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-red-600 font-bold ml-2">
              ✕
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {/* STEP 1: SMART CUSTOMER SEARCH */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-100">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ग्राहक का मोबाइल नंबर दर्ज करें / Enter Customer Mobile Number:
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    autoFocus
                    placeholder="उदा. 9876543210 (Exact or partial mobile / Name)"
                    value={mobileQuery}
                    onChange={(e) => handleSearchCustomer(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-blue-300 bg-white text-base font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                  <Search className="w-5 h-5 text-blue-500 absolute left-3 top-3.5" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  सिस्टम पहले से मौजूद ग्राहक को स्वतः पहचानेगा ताकि बार-बार नाम-पता दर्ज न करना पड़े।
                </p>
              </div>

              {/* Matched Customers List */}
              {isSearching ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  खोज जारी है... / Searching customer database...
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase">
                    मिले हुए ग्राहक / Matched Customers ({searchResults.length}):
                  </p>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                    {searchResults.map((cust) => (
                      <div
                        key={cust.id}
                        onClick={() => {
                          setSelectedCustomer(cust);
                          setStep(2);
                        }}
                        className="p-3 bg-white hover:bg-blue-50 transition cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900 text-sm">{cust.name}</span>
                            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-mono">
                              {cust.mobile}
                            </span>
                          </div>
                          {cust.address && <p className="text-xs text-slate-500 mt-0.5">{cust.address}</p>}
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2.5 py-1 rounded-lg">
                            चुनें / Select →
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : mobileQuery.length >= 3 && !showNewCustomerForm ? (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <p className="text-xs text-slate-600 mb-2">
                    इस नंबर का कोई पुराना रिकॉर्ड नहीं मिला। नया ग्राहक पंजीकृत करें?
                  </p>
                  <button
                    onClick={() => {
                      setShowNewCustomerForm(true);
                      setNewCustMobile(mobileQuery.replace(/\D/g, ""));
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition cursor-pointer"
                  >
                    + नया ग्राहक पंजीकृत करें / Register New Customer
                  </button>
                </div>
              ) : null}

              {/* New Customer Form Modal or Inline */}
              {(showNewCustomerForm || searchResults.length === 0 && mobileQuery.length === 0) && (
                <div className="border border-slate-200 p-4 rounded-xl bg-slate-50 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                    <UserPlus className="w-4 h-4 text-blue-600" />
                    <span>नया ग्राहक पंजीकरण / New Customer Registration</span>
                  </h3>

                  <form onSubmit={handleRegisterNewCustomer} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        ग्राहक का नाम / Customer Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="उदा. राहुल कुमार / Rahul Kumar"
                        value={newCustName}
                        onChange={(e) => setNewCustName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        10 अंकों का मोबाइल नंबर / Mobile Number *
                      </label>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        placeholder="9876543210"
                        value={newCustMobile}
                        onChange={(e) => setNewCustMobile(e.target.value.replace(/\D/g, ""))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        पता / Address (वैकल्पिक / Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="उदा. हाउस 142, सेक्टर 14, गुरुग्राम"
                        value={newCustAddress}
                        onChange={(e) => setNewCustAddress(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition cursor-pointer"
                    >
                      ग्राहक सुरक्षित करें और आगे बढ़ें / Save Customer & Next →
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: HANDWRITTEN SLIP PHOTOGRAPHY & OCR */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Selected Customer Card */}
              {selectedCustomer && (
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-blue-700 font-bold uppercase">चयनित ग्राहक / Customer:</span>
                    <h3 className="font-bold text-slate-900 text-sm">{selectedCustomer.name}</h3>
                    <p className="text-xs text-slate-600 font-mono">{selectedCustomer.mobile}</p>
                  </div>
                  <button
                    onClick={() => setStep(1)}
                    className="text-xs text-blue-600 font-semibold underline cursor-pointer"
                  >
                    बदलें / Change
                  </button>
                </div>
              )}

              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-5 text-center bg-slate-50/50">
                <Camera className="w-10 h-10 text-blue-600 mx-auto mb-2 animate-pulse" />
                <h3 className="text-sm font-bold text-slate-800">
                  हस्तलिखित रसीद का फोटो लें / Photograph Handwritten Slip
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                  दुकान की मौजूदा पर्ची का फोटो मोबाइल कैमरा से लें। OCR स्वचालित रूप से रसीद संख्या, कपड़े और डिलीवरी तारीख निकाल लेगा।
                </p>

                {/* Mobile Camera Upload Trigger */}
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <label className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition cursor-pointer shadow-xs active:scale-95">
                    <Camera className="w-4 h-4" />
                    <span>कैमरा खोलें / Open Camera</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoCapture}
                      className="hidden"
                    />
                  </label>

                  <label className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white text-slate-700 border border-slate-300 font-bold text-xs hover:bg-slate-100 transition cursor-pointer active:scale-95">
                    <Upload className="w-4 h-4" />
                    <span>फ़ाइल अपलोड / Upload Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoCapture}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Quick Testing Sample Slips */}
                <div className="mt-5 pt-4 border-t border-slate-200">
                  <p className="text-[11px] font-bold text-slate-500 uppercase mb-2">
                    या त्वरित परीक्षण हेतु नमूना रसीद चुनें / Or select sample slip:
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      onClick={() => handleProcessOcr({ sampleId: "sample_1" })}
                      disabled={ocrLoading}
                      className="text-xs px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg hover:border-blue-400 hover:text-blue-700 transition cursor-pointer font-medium"
                    >
                      📄 पर्ची #402 (राहुल - 5 शर्ट, 3 पैंट, 2 साड़ी)
                    </button>
                    <button
                      onClick={() => handleProcessOcr({ sampleId: "sample_2" })}
                      disabled={ocrLoading}
                      className="text-xs px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg hover:border-blue-400 hover:text-blue-700 transition cursor-pointer font-medium"
                    >
                      📄 पर्ची #510 (प्रिया - कुर्ती, सलवार, ब्लेज़र)
                    </button>
                    <button
                      onClick={() => handleProcessOcr({ sampleId: "sample_3" })}
                      disabled={ocrLoading}
                      className="text-xs px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg hover:border-blue-400 hover:text-blue-700 transition cursor-pointer font-medium"
                    >
                      📄 पर्ची #625 (विक्रांत - चादर, कंबल)
                    </button>
                  </div>
                </div>
              </div>

              {ocrLoading && (
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-center space-y-1">
                  <div className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-bold text-indigo-900">
                    हस्तलिखित पर्ची का विश्लेषण जारी है... / Processing slip with OCR...
                  </p>
                </div>
              )}

              {/* Skip OCR button */}
              <div className="text-center pt-2">
                <button
                  onClick={() => setStep(3)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  फोटो/OCR छोड़ें और सीधे कपड़े दर्ज करें / Skip slip photo & enter garments manually →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: GARMENT SELECTION & DELIVERY DATE */}
          {step === 3 && (
            <div className="space-y-5">
              {/* Slip Number & Photo Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    हस्तलिखित रसीद संख्या / Slip Number:
                  </label>
                  <input
                    type="text"
                    placeholder="उदा. 402 या SLP-101"
                    value={slipNumber}
                    onChange={(e) => setSlipNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs font-semibold"
                  />
                  {uncertainFields.includes("slipNumber") && (
                    <span className="text-[11px] text-amber-700 font-bold flex items-center space-x-1 mt-0.5">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      <span>⚠️ OCR संदिग्ध - कृपया जाँचें</span>
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    अपेक्षित डिलीवरी तारीख / Expected Delivery Date *:
                  </label>
                  <input
                    type="date"
                    required
                    value={expectedDeliveryDate}
                    onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Quick Catalogue Picker */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  परिधान सूची से चुनें / Pick Garments from Catalogue:
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200">
                  {catalogue.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleAddGarment(cat)}
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition cursor-pointer flex items-center space-x-1 active:scale-95"
                    >
                      <span>{cat.hindiName}</span>
                      <span className="text-slate-400">({cat.englishName})</span>
                      <Plus className="w-3 h-3 text-blue-600 ml-1" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Garment Line Items */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-4 py-2 flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>ऑर्डर के कपड़े / Selected Garments ({selectedGarments.length})</span>
                  <span className="text-blue-700">
                    कुल संख्या / Total Qty: {totalExpectedQuantity} कपड़े
                  </span>
                </div>

                {selectedGarments.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    अभी कोई कपड़ा नहीं चुना गया है। ऊपर दी गई सूची से कपड़े चुनें।
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {selectedGarments.map((item, idx) => (
                      <div key={idx} className="p-3 bg-white flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-slate-900 text-sm">{item.hindiName}</span>
                            <span className="text-xs text-slate-500">({item.englishName})</span>
                          </div>
                          {item.notes && <p className="text-[11px] text-slate-400">{item.notes}</p>}
                        </div>

                        <div className="flex items-center space-x-2">
                          {/* Quantity Stepper */}
                          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(idx, -1)}
                              className="px-2 py-1 text-slate-600 hover:bg-slate-200 cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-3 font-bold text-xs text-slate-900 font-mono">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(idx, 1)}
                              className="px-2 py-1 text-slate-600 hover:bg-slate-200 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveGarment(idx)}
                            className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Special Instructions */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  विशेष निर्देश / Special Instructions:
                </label>
                <input
                  type="text"
                  placeholder="उदा. साड़ी पर रोल पॉलिश, कॉलर पर कड़ा प्रेस, हैंगर पैकिंग"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                />
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-xs text-slate-600 font-semibold cursor-pointer"
                >
                  ← पीछे / Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  disabled={selectedGarments.length === 0}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
                >
                  समीक्षा करें / Review Order →
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & CONFIRM */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase">ग्राहक / Customer:</span>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 text-sm">{selectedCustomer?.name}</span>
                    <p className="text-xs text-slate-500 font-mono">{selectedCustomer?.mobile}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase">रसीद संख्या / Slip No:</span>
                  <span className="font-bold text-slate-900 text-xs">
                    {slipNumber || "लागू नहीं / None"}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase">
                    डिलीवरी तारीख / Expected Delivery:
                  </span>
                  <span className="font-bold text-blue-700 text-xs font-mono">
                    {expectedDeliveryDate}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase">
                    कुल अपेक्षित कपड़े / Total Expected:
                  </span>
                  <span className="font-black text-lg text-red-700 bg-red-50 px-2.5 py-0.5 rounded-lg border border-red-200">
                    {totalExpectedQuantity} कपड़े / Pcs
                  </span>
                </div>
              </div>

              {/* Garment summary table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <div className="bg-slate-100 px-3 py-2 font-bold text-slate-700">
                  कपड़ों का विवरण / Garment Breakdown:
                </div>
                <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto">
                  {selectedGarments.map((g, idx) => (
                    <div key={idx} className="p-2.5 bg-white flex justify-between">
                      <span className="font-medium text-slate-900">
                        {g.hindiName} ({g.englishName})
                      </span>
                      <span className="font-bold text-slate-800 font-mono">{g.quantity} नग</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Business Rule Reminder */}
              <p className="text-[11px] text-slate-500 bg-blue-50 p-2.5 rounded-lg border border-blue-200">
                ℹ️ ऑर्डर सुरक्षित होने के बाद प्रारंभिक स्थिति <strong>QUANTITY_PENDING</strong> रहेगी।
                कार्यशाला स्टाफ कपड़ों की भौतिक जाँच करने के बाद ही QR कोड जनरेट कर सकेगा।
              </p>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="text-xs text-slate-600 font-semibold cursor-pointer"
                >
                  ← बदलाव करें / Edit
                </button>
                <button
                  type="button"
                  onClick={handleSubmitOrder}
                  disabled={isSubmitting}
                  className="px-6 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? "सुरक्षित किया जा रहा है..." : "✓ ऑर्डर सुरक्षित करें / Save Order"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
