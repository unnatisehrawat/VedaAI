import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export function getModel(systemInstruction) {
  const apiKey = process.env.GEMINI_API_KEY || "";
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  });
}

export async function callGeminiJSON({ systemInstruction, userPrompt, images = [] }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured.");
  }

  const imageParts = images.map((img) => ({
    inlineData: { data: img.base64, mimeType: img.mimeType },
  }));

  const attempt = async (extraNote = "") => {
    const model = getModel(systemInstruction);
    const result = await model.generateContent([
      { text: userPrompt + extraNote },
      ...imageParts,
    ]);
    return JSON.parse(result.response.text());
  };

  try {
    return await attempt();
  } catch (err) {
    console.warn("Gemini call failed, retrying once:", err.message);
    return await attempt(
      "\n\nIMPORTANT: Your previous response was not valid JSON. Return ONLY valid JSON, no markdown, no commentary."
    );
  }
}
