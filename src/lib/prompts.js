export const QUESTION_EXTRACTION_PROMPT = `
You are extracting questions from a printed exam question paper image.

Rules:
- Extract every question and every labelled sub-part, in the exact order they appear on the page(s).
- Treat labelled sub-parts as SEPARATE entries. Example: "11(a)" and "11(b)" must be two separate objects, never merged.
- Preserve the original numbering exactly as printed, including any punctuation (e.g. "Q3", "11(a)", "2.iv", "Section B - 4").
- Include the full question text, cleaned of OCR artifacts but not paraphrased.
- If maximum marks are printed next to a question, extract them as a number. Otherwise null.
- Record which page(s) each question appears on, 1-indexed in the order images were provided.
- Do not invent questions that are not present. Do not skip any that are present.
- Output ONLY valid JSON matching this exact shape, nothing else:

{
  "questions": [
    {
      "id": "string",
      "number": "string",
      "text": "string",
      "maxMarks": number or null,
      "pageStart": number,
      "pageEnd": number
    }
  ]
}
`;

export function buildAnswerExtractionPrompt(questions) {
  return `
You are an expert exam evaluation assistant. Analyze the student's handwritten answer sheet images and locate each answer.

QUESTIONS TO LOCATE:
${JSON.stringify(questions, null, 2)}

Instructions:
1. For every question in the list, search the answer sheet pages for the student's handwritten answer.
2. Transcribe the full handwritten answer text accurately and completely.
3. Provide the exact bounding box for the complete handwritten answer block:
   - "box": [ymin, xmin, ymax, xmax] as normalized integers from 0 to 1000.
   - "ymin": Top boundary MUST start ABOVE the "Answer X:" heading. Do NOT skip the heading.
   - "xmin": Left boundary starting at the paper's vertical margin line.
   - "ymax": Bottom boundary covering ALL lines of this answer down to the very last word.
   - "xmax": Right boundary extending past the rightmost word of this answer (around 950-980).
   - "page": 1-indexed page number where this answer appears.
4. IMPORTANT: The box MUST enclose the COMPLETE multi-line answer block (heading, all sentences, paragraphs, and examples). Do NOT just crop around the first sentence. Each answer must have its own distinct box.
5. In addition to the box, provide "startsWith" (the first 5-7 words of the handwritten answer text) and "endsWith" (the last 5-7 words of the handwritten answer text) to serve as text anchors.
6. If handwritten content does not belong to any listed question, put it in "unmatchedAnswers".

Output ONLY valid JSON matching this schema:
{
  "answers": [
    {
      "questionId": "string",
      "transcription": "string",
      "regions": [
        {
          "page": number,
          "box": [ymin, xmin, ymax, xmax],
          "startsWith": "string",
          "endsWith": "string",
          "boxConfidence": "high" | "medium" | "low"
        }
      ]
    }
  ],
  "unmatchedAnswers": [
    {
      "transcription": "string",
      "regions": [
        {
          "page": number,
          "box": [ymin, xmin, ymax, xmax],
          "startsWith": "string",
          "endsWith": "string",
          "boxConfidence": "high" | "medium" | "low"
        }
      ],
      "note": "string"
    }
  ]
}
`;
}

export function buildGradingPrompt(questions, answers) {
  return `
You are an expert exam examiner grading student answers. For each question below, you are given the question text, maxMarks (if available), and the student's transcribed answer.

DATA:
${JSON.stringify(
    questions.map((q) => ({
      ...q,
      studentAnswer: answers.find((a) => a.questionId === q.id)?.transcription || null,
    })),
    null,
    2
  )}

CRITICAL MARK-WEIGHTAGE EVALUATION RULES:
1. When maxMarks is provided, calibrate your scoring based on the expected depth, detail, and length proportional to the marks:
   - 1-2 Marks (Short Answer): Requires concise, direct accuracy (1-2 sentences, key definition, formula, or direct example). Award full marks (e.g. 2/2) for direct, correct answers.
   - 3-4 Marks (Medium Answer): Requires moderate elaboration, multiple distinct points (e.g. definition + 2-3 supporting points, steps, or working). A single-sentence answer is insufficient for 3-4 marks; award partial credit (e.g. 2/4 or 1/3) and note missing points in feedback.
   - 5+ Marks (Long / Comprehensive Answer): Requires comprehensive, detailed explanations covering multiple facets, step-by-step processes, diagrams/labels (if asked), and thorough substance. A brief 1-2 sentence answer for a 5-mark question must NOT receive full marks (award partial credit e.g. 1/5 or 2/5) and explicitly explain in the feedback that the answer lacked the depth and length required for a 5-mark question.

2. Score Range:
   - "score": Must be between 0 and maxMarks (or 0-10 if maxMarks is null).
   - "verdict":
     * "correct" (full score achieved, e.g. score === maxMarks)
     * "partially correct" (partially answered, correct but lacking depth/length for mark range, or minor errors, e.g. 0 < score < maxMarks)
     * "incorrect" (wrong answer or score === 0)

3. Feedback:
   - Provide 1-2 constructive, specific sentences. 
   - If the student answered correctly, use encouraging phrases like "Excellent work!", "Keep it up!", or "Great job!" to start or end the feedback, just like a supportive teacher.
   - If marks were deducted due to insufficient length/detail for the question's mark weightage, explicitly explain what was missing.

Output ONLY valid JSON matching this exact format:
{
  "grades": [
    {
      "questionId": "string",
      "score": number,
      "verdict": "correct" | "partially correct" | "incorrect",
      "feedback": "string"
    }
  ]
}
`;
}

