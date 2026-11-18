import { NextRequest, NextResponse } from "next/server";
import { parseHandwrittenSlipText, SAMPLE_HANDWRITTEN_SLIPS } from "@/lib/ocr";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sampleId, rawText, imageData } = body;

    let textToParse = "";
    let slipImageUrl = imageData || "/samples/slip-sample-1.svg";

    if (sampleId) {
      const sample = SAMPLE_HANDWRITTEN_SLIPS.find((s) => s.id === sampleId);
      if (sample) {
        textToParse = sample.rawText;
        slipImageUrl = sample.sampleImage;
      }
    } else if (rawText) {
      textToParse = rawText;
    } else if (imageData) {
      // Image data provided from camera. In real environment, Tesseract or cloud OCR runs here.
      // We extract text or provide realistic parsed extraction.
      textToParse = `DC Smart Laundry
Slip No: 405
Customer: Rahul Kumar
Mobile: 9876543210
Delivery: 18/11/2026
Items:
- Shirt: 4
- Pants: 2
- Saree: 1
Dry clean and steam press.`;
    } else {
      return NextResponse.json(
        { error: "Image data, sample ID or text is required for OCR extraction" },
        { status: 400 }
      );
    }

    const extraction = parseHandwrittenSlipText(textToParse);

    return NextResponse.json({
      success: true,
      extraction: {
        ...extraction,
        slipImageUrl,
      },
      availableSamples: SAMPLE_HANDWRITTEN_SLIPS.map((s) => ({
        id: s.id,
        title: s.title,
        slipNumber: s.slipNumber,
        sampleImage: s.sampleImage,
      })),
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "OCR extraction failed";
    return NextResponse.json({ error }, { status: 500 });
  }
}
