import { db } from "@/db";
import { notifications, appSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export interface SendWhatsAppReadyNotificationParams {
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  totalGarments: number;
}

export async function sendOrderReadyWhatsAppNotification(
  params: SendWhatsAppReadyNotificationParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // 1. Check if a READY notification was already sent for this order (prevent duplicate WhatsApp messages)
    const existing = await db
      .select()
      .from(notifications)
      .where(eq(notifications.orderId, params.orderId))
      .limit(1);

    if (existing.length > 0 && existing[0].status === "SENT") {
      return {
        success: true,
        messageId: existing[0].providerMessageId || undefined,
        error: "Notification already sent previously. Duplicate prevented.",
      };
    }

    // 2. Fetch app settings for WhatsApp Cloud API
    const settingsRows = await db.select().from(appSettings);
    const settingsMap = new Map(settingsRows.map((s) => [s.key, s.value]));

    const isEnabled = settingsMap.get("WHATSAPP_ENABLED") !== "false";
    const mode = settingsMap.get("WHATSAPP_MODE") || "SIMULATION";
    const phoneNumberId = settingsMap.get("WHATSAPP_PHONE_NUMBER_ID") || process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = settingsMap.get("WHATSAPP_ACCESS_TOKEN") || process.env.WHATSAPP_ACCESS_TOKEN;
    const templateName = settingsMap.get("WHATSAPP_TEMPLATE_NAME") || "order_ready_hi";

    if (!isEnabled) {
      return { success: false, error: "WhatsApp notifications are disabled in settings." };
    }

    // 3. Format message (Hindi & English bilingual greeting as requested in prompt)
    const messageBody = `नमस्ते ${params.customerName} Ji,

आपका Laundry Order ${params.orderNumber} (${params.totalGarments} कपड़े) पूरी तरह तैयार है।

आप अपने कपड़े DC Smart Laundry की दुकान से प्राप्त कर सकते हैं।

दुकान का पता: Shop No. 12, Main Market, Sector 14, Gurugram
संपर्क: 0124-4200100

धन्यवाद!
DC Smart Laundry`;

    let providerMessageId = `wamid.SIMULATED_${crypto.randomBytes(8).toString("hex").toUpperCase()}`;
    let status = "SENT";
    let errorMessage: string | null = null;

    // 4. If Live mode and credentials exist, call Meta Graph API
    if (mode === "LIVE" && phoneNumberId && accessToken) {
      try {
        const payload = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: `91${params.customerMobile}`,
          type: "text",
          text: { preview_url: false, body: messageBody },
        };

        const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (res.ok && data.messages?.[0]?.id) {
          providerMessageId = data.messages[0].id;
          status = "SENT";
        } else {
          status = "FAILED";
          errorMessage = data?.error?.message || "WhatsApp API request failed";
        }
      } catch (err: unknown) {
        status = "FAILED";
        errorMessage = err instanceof Error ? err.message : "Network error during WhatsApp send";
      }
    }

    // 5. Store in notifications log
    const notificationId = crypto.randomUUID();
    await db.insert(notifications).values({
      id: notificationId,
      orderId: params.orderId,
      customerId: params.customerId,
      recipientMobile: params.customerMobile,
      channel: "WHATSAPP",
      templateName,
      messageBody,
      status,
      providerMessageId,
      errorMessage,
      sentAt: new Date(),
    });

    return {
      success: status === "SENT",
      messageId: providerMessageId,
      error: errorMessage || undefined,
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Unknown error in WhatsApp notification";
    return { success: false, error };
  }
}
