import { callGeminiJSON } from "../../lib/gemini";
import { buildGradingPrompt } from "../../lib/prompts";
import { gradingSchema } from "../../lib/schemas";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { questions, answers } = req.body || {};
  if (!Array.isArray(questions)) return res.status(400).json({ error: "questions is required" });
  if (!Array.isArray(answers)) return res.status(400).json({ error: "answers is required" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is not configured on the server. Please add it to your .env.local file.",
    });
  }

  try {
    const answered = questions.filter((q) => answers.some((a) => a.questionId === q.id));
    if (answered.length === 0) {
      return res.status(200).json({ grades: [] });
    }

    const raw = await callGeminiJSON({
      systemInstruction: "You are an expert exam examiner. Accurately score and evaluate student answers against questions based on mark weightage (1-2 marks short answers vs 3-4 marks medium answers vs 5+ marks comprehensive answers), assessing content depth, detail, and substance proportional to the marks.",
      userPrompt: buildGradingPrompt(questions, answers),
    });

    const parsed = gradingSchema.safeParse(raw);
    if (!parsed.success) {
      console.error("Schema validation failed in grading:", parsed.error);
      return res.status(502).json({
        error: "Gemini returned an invalid grading format"
      });
    }

    return res.status(200).json(parsed.data);
  } catch (err) {
    console.error("Grading API error:", err);
    return res.status(502).json({
      error: "Failed to grade answers using Gemini"
    });
  }
}
