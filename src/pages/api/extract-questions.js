import { callGeminiJSON } from "../../lib/gemini";
import { QUESTION_EXTRACTION_PROMPT } from "../../lib/prompts";
import { questionExtractionSchema } from "../../lib/schemas";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "15mb",
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { questionPaperImages } = req.body || {};
  if (!Array.isArray(questionPaperImages) || questionPaperImages.length === 0) {
    return res.status(400).json({ error: "questionPaperImages is required" });
  }

  const invalidImage = questionPaperImages.some(
    (img) =>
      !img ||
      typeof img.base64 !== "string" ||
      typeof img.mimeType !== "string"
  );

  if (invalidImage) {
    return res.status(400).json({ error: "Invalid image format" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is not configured on the server. Please add it to your .env.local file.",
    });
  }

  try {
    const raw = await callGeminiJSON({
      systemInstruction: "You are a precise question paper parser. Extract questions into the requested schema.",
      userPrompt: QUESTION_EXTRACTION_PROMPT,
      images: questionPaperImages,
    });

    const parsed = questionExtractionSchema.safeParse(raw);
    if (!parsed.success) {
      console.error("Schema validation failed:", parsed.error);
      return res.status(502).json({
        error: "Gemini returned an invalid questions format"
      });
    }

    if (parsed.data.questions.length === 0) {
      return res.status(422).json({
        error: "No questions could be extracted from the uploaded paper"
      });
    }

    // Strip trailing/internal dots & colons from question numbers
    const sanitizedQuestions = parsed.data.questions.map(q => ({
      ...q,
      number: String(q.number || "").replace(/[.:]/g, "").trim()
    }));

    return res.status(200).json({ questions: sanitizedQuestions });
  } catch (err) {
    console.error(err);
    return res.status(502).json({
      error: "Failed to extract questions using Gemini"
    });
  }
}
