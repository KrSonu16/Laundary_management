import { OcrExtractionResult } from "./types";

interface GarmentMatch {
  hindiName: string;
  englishName: string;
  quantity: number;
  confidence: number;
}

const COMMON_GARMENTS = [
  { hindi: "शर्ट", english: "Shirt", regex: /(?:शर्ट|shirt|shrt|shirts)/i },
  { hindi: "पैंट", english: "Pants", regex: /(?:पैंट|पेंट|pants|pant|trousers)/i },
  { hindi: "टी-शर्ट", english: "T-Shirt", regex: /(?:टी[- ]?शर्ट|t[- ]?shirt|tshirt)/i },
  { hindi: "जींस", english: "Jeans", regex: /(?:जींस|जीन्स|jeans|jean)/i },
  { hindi: "साड़ी", english: "Saree", regex: /(?:साड़ी|साड़ी|saree|sari)/i },
  { hindi: "ब्लाउज", english: "Blouse", regex: /(?:ब्लाउज|blouse|choli)/i },
  { hindi: "कुर्ती", english: "Kurti", regex: /(?:कुर्ती|kurti|kurta)/i },
  { hindi: "सलवार", english: "Salwar", regex: /(?:सलवार|salwar|suit)/i },
  { hindi: "सूट", english: "Suit", regex: /(?:सूट|suit|safari)/i },
  { hindi: "ब्लेज़र", english: "Blazer", regex: /(?:ब्लेज़र|ब्लेजर|blazer)/i },
  { hindi: "कोट", english: "Coat", regex: /(?:कोट|coat|overcoat)/i },
  { hindi: "जैकेट", english: "Jacket", regex: /(?:जैकेट|jacket)/i },
  { hindi: "स्वेटर", english: "Sweater", regex: /(?:स्वेटर|sweater|cardigan)/i },
  { hindi: "चादर", english: "Bedsheet", regex: /(?:चादर|bedsheet|bed sheet)/i },
  { hindi: "कंबल", english: "Blanket", regex: /(?:कंबल|blanket|quilt)/i },
  { hindi: "पर्दा", english: "Curtain", regex: /(?:पर्दा|curtain)/i },
];

/**
 * Intelligent parser for handwritten laundry slips.
 * Returns parsed fields, confidence scores, and uncertain fields.
 */
export function parseHandwrittenSlipText(rawText: string): OcrExtractionResult {
  const uncertainFields: string[] = [];

  // 1. Slip Number
  let slipNumber: string | null = null;
  const slipMatch = rawText.match(/(?:slip\s*no|receipt\s*no|रसीद\s*नं|no|बिल\s*नं)[.:\s-]*([A-Z0-9/-]+)/i);
  if (slipMatch && slipMatch[1]) {
    slipNumber = slipMatch[1].trim();
  } else {
    // Fallback: look for 3 to 6 digits alone at top
    const numMatch = rawText.match(/#\s*([0-9]{3,6})/);
    if (numMatch) {
      slipNumber = numMatch[1];
      uncertainFields.push("slipNumber");
    } else {
      uncertainFields.push("slipNumber");
    }
  }

  // 2. Mobile Number (10 digits starting with 6-9)
  let mobile: string | null = null;
  const mobileMatch = rawText.match(/(?:[6-9]\d{9})/);
  if (mobileMatch) {
    mobile = mobileMatch[0];
  } else {
    uncertainFields.push("mobile");
  }

  // 3. Customer Name
  let customerName: string | null = null;
  const nameMatch = rawText.match(/(?:name|ग्राहक|नाम|mr|mrs|shri|shree|customer)[.:\s-]*([A-Za-z\u0900-\u097F\s]{2,30})/i);
  if (nameMatch && nameMatch[1]) {
    customerName = nameMatch[1].trim();
  } else {
    uncertainFields.push("customerName");
  }

  // 4. Expected Delivery Date
  let expectedDeliveryDate: string | null = null;
  const dateMatch = rawText.match(/(?:del(?:ivery)?|delivery\s*date|वापसी|डिलीवरी|target)[.:\s-]*(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/i);
  if (dateMatch && dateMatch[1]) {
    const rawDate = dateMatch[1];
    const parts = rawDate.split(/[-/.]/);
    if (parts.length === 3) {
      const day = parts[0].padStart(2, "0");
      const month = parts[1].padStart(2, "0");
      let year = parts[2];
      if (year.length === 2) year = `20${year}`;
      expectedDeliveryDate = `${year}-${month}-${day}`;
    }
  } else {
    // Default to +3 days from today
    const d = new Date();
    d.setDate(d.getDate() + 3);
    expectedDeliveryDate = d.toISOString().split("T")[0];
    uncertainFields.push("expectedDeliveryDate");
  }

  // 5. Garment items & quantities
  const garments: GarmentMatch[] = [];
  const lines = rawText.split("\n");

  for (const line of lines) {
    for (const g of COMMON_GARMENTS) {
      if (g.regex.test(line)) {
        // Find quantity in this line (e.g. "5", "- 5", "x 3", "qty: 2")
        const qtyMatch = line.match(/(?:[-:x\s]|\b)(\d{1,3})(?:\s*(?:pcs|piece|no|नग)?)?(?:\b|$)/i);
        const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
        const confidence = qtyMatch ? 0.9 : 0.7;

        if (confidence < 0.8) {
          uncertainFields.push(`garment_${g.english}`);
        }

        // Avoid duplicate garment entries from same line
        if (!garments.some((item) => item.englishName === g.english)) {
          garments.push({
            hindiName: g.hindi,
            englishName: g.english,
            quantity: Math.max(1, qty),
            confidence,
          });
        }
      }
    }
  }

  if (garments.length === 0) {
    uncertainFields.push("garments");
  }

  const confidenceOverall = Math.max(
    0.5,
    Math.min(1.0, 1 - (uncertainFields.length * 0.12))
  );

  return {
    slipNumber,
    customerName,
    mobile,
    receivedDate: new Date().toISOString().split("T")[0],
    expectedDeliveryDate,
    garments,
    notes: null,
    rawText,
    confidenceOverall: parseFloat(confidenceOverall.toFixed(2)),
    uncertainFields,
  };
}

/**
 * Realistic Sample Handwritten Slips for quick testing in shopkeeper workflow
 */
export const SAMPLE_HANDWRITTEN_SLIPS = [
  {
    id: "sample_1",
    title: "Slip #402 - Rahul Kumar (Shirts, Pants & Saree)",
    slipNumber: "SLP-402",
    sampleImage: "/samples/slip-sample-1.svg",
    rawText: `DC Smart Laundry - रसीद
Slip No: 402
Date: 15/11/2026
Customer: Rahul Kumar (राहुल कुमार)
Mob: 9876543210
Delivery: 18/11/2026

Items / कपड़े:
- Shirt (शर्ट) : 5
- Pants (पैंट) : 3
- Saree (साड़ी) : 2
Urgent dry clean for saree.
Collar press on shirts.`,
  },
  {
    id: "sample_2",
    title: "Slip #510 - Priya Sharma (Suits, Kurti & Blazer)",
    slipNumber: "SLP-510",
    sampleImage: "/samples/slip-sample-2.svg",
    rawText: `DC Smart Laundry
रसीद नं: 510
ग्राहक: Priya Sharma
मोबाइल: 9811223344
डिलीवरी: 19/11/2026

कपड़े:
1. Kurti - 4
2. Salwar - 2
3. Blazer - 1
Dry cleaning with steam press.`,
  },
  {
    id: "sample_3",
    title: "Slip #625 - Vikrant Singh (Bedsheet & Blanket)",
    slipNumber: "SLP-625",
    sampleImage: "/samples/slip-sample-3.svg",
    rawText: `DC Smart Laundry Slip
Receipt #625
Customer: Vikrant Singh
Phone: 9822334455
Target Date: 20/11/2026

Garments:
- Bedsheet (चादर) - 3
- Blanket (कंबल) - 2
- Towel - 4
Heavy wash and sanitization.`,
  },
];
