import { callGeminiJSON } from "../../lib/gemini";
import { buildAnswerExtractionPrompt } from "../../lib/prompts";
import { answerExtractionSchema } from "../../lib/schemas";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "35mb",
    },
  },
};

function normalize(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

function validateRegionAnchor(region, transcription) {
  if (!region.startsWith) return region; // model didn't provide an anchor, leave confidence as-is

  const anchorWords = normalize(region.startsWith).split(/\s+/).filter(Boolean).slice(0, 4);
  const transcriptionWords = normalize(transcription).split(/\s+/).filter(Boolean).slice(0, 12);

  const anchorMatches = anchorWords.length > 0 &&
    anchorWords.every((w) => transcriptionWords.includes(w));

  if (!anchorMatches) {
    return { ...region, boxConfidence: "low" };
  }
  return region;
}

// Safeguard coordinates so highlights never break the screen layout
function sanitizeAnswerResult(data) {
  const clampBox = (box) => {
    if (!Array.isArray(box) || box.length < 4) return [0, 0, 1000, 1000];
    const [ymin, xmin, ymax, xmax] = box;

    const SCALE = 1000;
    const c = (n) => Math.min(SCALE, Math.max(0, Number(n) || 0));
    let [y0, x0, y1, x1] = [c(ymin), c(xmin), c(ymax), c(xmax)];
    if (y1 <= y0) y1 = Math.min(SCALE, y0 + SCALE * 0.02);
    if (x1 <= x0) x1 = Math.min(SCALE, x0 + SCALE * 0.02);
    return [y0, x0, y1, x1];
  };

  const fixRegions = (regions, transcription) =>
    (regions || []).map((r) => {
      const withValidatedAnchor = validateRegionAnchor(r, transcription);
      return { ...withValidatedAnchor, box: clampBox(withValidatedAnchor.box) };
    });

  return {
    answers: data.answers.map((a) => ({
      ...a,
      regions: fixRegions(a.regions, a.transcription),
    })),
    unmatchedAnswers: data.unmatchedAnswers.map((u) => ({
      ...u,
      regions: fixRegions(u.regions, u.transcription),
    })),
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { answerSheetImages, questions } = req.body || {};
  if (!Array.isArray(answerSheetImages) || answerSheetImages.length === 0) {
    return res.status(400).json({ error: "answerSheetImages is required" });
  }
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: "questions list is required" });
  }

  const invalidImage = answerSheetImages.some(
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
      systemInstruction: "You are a precise answer sheet matching assistant. Extract student answers and identify their bounding box page regions.",
      userPrompt: buildAnswerExtractionPrompt(questions),
      images: answerSheetImages,
    });

    console.log("RAW Gemini answer:", JSON.stringify(raw.answers?.[0], null, 2));

    const parsed = answerExtractionSchema.safeParse(raw);
    if (!parsed.success) {
      console.error("Schema validation failed:", parsed.error);
      return res.status(502).json({
        error: "Gemini returned an invalid answers format"
      });
    }

    const sanitized = sanitizeAnswerResult(parsed.data);
    return res.status(200).json(sanitized);
  } catch (err) {
    console.error(err);
    return res.status(502).json({
      error: "Failed to extract answers using Gemini"
    });
  }
}
