import { z } from "zod";

export const questionExtractionSchema = z.object({
  questions: z.array(
    z.object({
      id: z.string(),
      number: z.string(),
      text: z.string(),
      maxMarks: z.number().nullable(),
      pageStart: z.number().int().positive(),
      pageEnd: z.number().int().positive(),
    })
  ),
});

const regionSchema = z.object({
  page: z.number().int().positive(),
  box: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  boxConfidence: z.enum(["high", "medium", "low"]),
});

export const answerExtractionSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string(),
      transcription: z.string(),
      regions: z.array(regionSchema).min(1),
    })
  ),
  unmatchedAnswers: z.array(
    z.object({
      transcription: z.string(),
      regions: z.array(regionSchema).min(1),
      note: z.string().optional(),
    })
  ),
});

export const gradingSchema = z.object({
  grades: z.array(
    z.object({
      questionId: z.string(),
      score: z.number(),
      verdict: z.enum(["correct", "partially correct", "incorrect"]),
      feedback: z.string(),
    })
  ),
});
