import { GoogleGenAI } from "@google/genai";

// Primary model — fast and capable
const PRIMARY_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";
// Backup model — used if primary fails (503 overload, 429 quota, etc.)
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-3.6-flash";

export async function callGeminiJSON({ systemInstruction, userPrompt, images = [] }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const buildParts = (extraNote = "") => [
    { text: userPrompt + extraNote },
    ...images.map((img) => ({ inlineData: { data: img.base64, mimeType: img.mimeType } })),
  ];

  const callModel = async (model, extraNote = "") => {
    const response = await ai.models.generateContent({
      model,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.2,
      },
      contents: [{ role: "user", parts: buildParts(extraNote) }],
    });
    return JSON.parse(response.text);
  };

  // Try primary model first
  try {
    return await callModel(PRIMARY_MODEL);
  } catch (primaryErr) {
    const isOverload = primaryErr.message?.includes("503") || primaryErr.message?.includes("429") || primaryErr.message?.includes("overload") || primaryErr.message?.includes("high demand");

    if (isOverload) {
      // Primary is overloaded — switch to fallback model immediately
      console.warn(`Primary model (${PRIMARY_MODEL}) overloaded. Switching to fallback (${FALLBACK_MODEL})...`);
      try {
        return await callModel(FALLBACK_MODEL);
      } catch (fallbackErr) {
        console.warn("Fallback model also failed, retrying with JSON hint...");
        return await callModel(FALLBACK_MODEL, "\n\nIMPORTANT: Return ONLY valid JSON, no markdown, no commentary.");
      }
    }

    // Not overload — retry same model with JSON correction hint
    console.warn(`Gemini call failed, retrying (${PRIMARY_MODEL}) with JSON hint:`, primaryErr.message);
    try {
      return await callModel(PRIMARY_MODEL, "\n\nIMPORTANT: Return ONLY valid JSON, no markdown, no commentary.");
    } catch (retryErr) {
      // Last resort: try fallback model
      console.warn(`Retry also failed. Switching to fallback (${FALLBACK_MODEL})...`);
      return await callModel(FALLBACK_MODEL, "\n\nIMPORTANT: Return ONLY valid JSON, no markdown, no commentary.");
    }
  }
}
