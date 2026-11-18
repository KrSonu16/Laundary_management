"use client";

import React, { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import {
  X,
  Camera,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Send,
  Sparkles,
  Smartphone,
  RefreshCw,
  Phone,
} from "lucide-react";

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (order: unknown) => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState("");
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    orderNumber?: string;
    customerName?: string;
    customerMobile?: string;
    message: string;
    whatsappSent?: boolean;
    whatsappPreview?: string;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const scannerRef = useRef<unknown>(null);
  const qrRegionId = "html5-qr-scanner-region";

  // Initialize html5-qrcode when opened
  useEffect(() => {
    let html5QrCodeInstance: any = null;

    if (isOpen) {
      setScanResult(null);
      setCameraError(null);

      // Dynamically load and start scanner
      import("html5-qrcode")
        .then(({ Html5Qrcode }) => {
          html5QrCodeInstance = new Html5Qrcode(qrRegionId);
          scannerRef.current = html5QrCodeInstance;

          html5QrCodeInstance
            .start(
              { facingMode: "environment" },
              {
                fps: 10,
                qrbox: { width: 250, height: 250 },
              },
              (decodedText: string) => {
                // QR Decoded
                handleTokenSubmission(decodedText);
              },
              () => {
                // Ignore frame parse errors
              }
            )
            .then(() => {
              setIsScanning(true);
            })
            .catch((err: unknown) => {
              console.warn("Camera start warning:", err);
              setCameraError("Camera not accessible or permission denied. You can use Quick Test Token below.");
              setIsScanning(false);
            });
        })
        .catch((err) => {
          setCameraError("Failed to load camera scanner component.");
        });
    }

    return () => {
      if (html5QrCodeInstance && html5QrCodeInstance.isScanning) {
        html5QrCodeInstance.stop().catch(console.error);
      }
    };
  }, [isOpen]);

  const handleTokenSubmission = async (token: string) => {
    if (!token || isProcessing) return;
    setIsProcessing(true);

    // Stop camera if scanning
    const instance = scannerRef.current as any;
    if (instance && instance.isScanning) {
      instance.stop().catch(console.error);
      setIsScanning(false);
    }

    try {
      const res = await fetch("/api/qr/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token.trim(),
          deviceInfo: "Android Mobile Scanner / Web Browser",
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Trigger celebratory confetti on transition to READY!
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });

        const previewMsg = `नमस्ते ${data.order?.customerName || "Customer"} Ji,
आपका Laundry Order ${data.order?.orderNumber} तैयार है।
आप अपने कपड़े DC Smart Laundry की दुकान से प्राप्त कर सकते हैं।
धन्यवाद! DC Smart Laundry`;

        setScanResult({
          success: true,
          orderNumber: data.order?.orderNumber,
          customerName: data.order?.customerName,
          customerMobile: data.order?.customerMobile,
          message: data.message,
          whatsappSent: data.whatsappNotification?.sent,
          whatsappPreview: previewMsg,
        });

        onScanSuccess(data.order);
      } else {
        setScanResult({
          success: false,
          message: data.message || data.error || "Scan failed",
        });
      }
    } catch (err: unknown) {
      setScanResult({
        success: false,
        message: err instanceof Error ? err.message : "Error submitting scan",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center space-x-2">
            <QrCode className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-sm font-black">
                Android QR स्कैनर / Android QR Scanner
              </h2>
              <p className="text-[11px] text-slate-400">
                कपड़े के बंडल पर लगा QR स्कैन करें → ऑर्डर स्वतः &apos;READY&apos; होगा
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Scan Result Confirmation Card */}
          {scanResult && (
            <div
              className={`p-4 rounded-xl border text-xs space-y-3 ${
                scanResult.success
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-red-50 border-red-200 text-red-900"
              }`}
            >
              <div className="flex items-center space-x-2">
                {scanResult.success ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
                )}
                <div>
                  <h3 className="font-extrabold text-sm">
                    {scanResult.success
                      ? "QR स्कैन सफल! ऑर्डर 'तैयार' हुआ"
                      : "स्कैन परिणाम / Scan Alert"}
                  </h3>
                  <p className="text-[11px]">{scanResult.message}</p>
                </div>
              </div>

              {/* WhatsApp Notification confirmation */}
              {scanResult.success && scanResult.whatsappPreview && (
                <div className="bg-white p-3 rounded-lg border border-emerald-200 space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between text-emerald-800 font-bold text-[11px]">
                    <span className="flex items-center space-x-1">
                      <Phone className="w-3 h-3 text-emerald-600" />
                      <span>व्हाट्सएप सूचना भेजी गई / WhatsApp Notification Sent</span>
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-mono">
                      +91 {scanResult.customerMobile}
                    </span>
                  </div>
                  <pre className="text-[11px] text-slate-700 whitespace-pre-wrap font-sans bg-slate-50 p-2 rounded border border-slate-200">
                    {scanResult.whatsappPreview}
                  </pre>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  onClick={() => {
                    setScanResult(null);
                    setManualToken("");
                  }}
                  className="px-3 py-1.5 bg-slate-800 text-white font-bold rounded-lg text-xs hover:bg-slate-900 cursor-pointer"
                >
                  पुनः स्कैन करें / Scan Another QR
                </button>
              </div>
            </div>
          )}

          {/* Camera Viewport Container */}
          <div className="bg-slate-900 rounded-xl overflow-hidden relative min-h-[260px] flex items-center justify-center">
            <div id={qrRegionId} className="w-full" />

            {!isScanning && !cameraError && (
              <div className="p-4 text-center text-slate-400 text-xs">
                कैमरा प्रारंभ हो रहा है... / Starting Android camera...
              </div>
            )}

            {cameraError && (
              <div className="p-6 text-center text-xs text-slate-400 space-y-2">
                <Camera className="w-8 h-8 text-slate-500 mx-auto" />
                <p>{cameraError}</p>
              </div>
            )}
          </div>

          {/* Quick Simulator Test Token (for easy testing without camera permissions) */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700">
                त्वरित टोकन सिम्युलेटर / Simulator Test:
              </span>
              <span className="text-[11px] text-slate-400">
                (बिना कैमरे के भी टेस्ट करें)
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="QR Token या DCQR-xxxx दर्ज करें..."
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white font-mono"
              />
              <button
                type="button"
                onClick={() => handleTokenSubmission(manualToken)}
                disabled={!manualToken.trim() || isProcessing}
                className="px-3.5 py-2 rounded-lg bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition cursor-pointer disabled:opacity-50 shrink-0"
              >
                {isProcessing ? "जाँच..." : "स्कैन करें / Test"}
              </button>
            </div>

            {/* Quick Test Preset Buttons */}
            <div className="pt-1">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await fetch("/api/settings");
                    const data = await res.json();
                    const testToken = data.settings?.SAMPLE_RAW_QR_TOKEN_FOR_TESTING;
                    if (testToken) {
                      setManualToken(testToken);
                      handleTokenSubmission(testToken);
                    }
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="text-[11px] text-indigo-700 font-bold underline cursor-pointer hover:text-indigo-900"
              >
                ⚡ नमूना ऑर्डर DC-2026-00102 का QR टोकन स्वतः भरें और टेस्ट करें
              </button>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={onClose}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              बंद करें / Close Scanner
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
