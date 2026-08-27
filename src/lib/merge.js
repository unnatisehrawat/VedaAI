export function mergeResults({ questions, answers, unmatchedAnswers, grades = [] }) {
  const answerByQid = new Map(answers.map((a) => [a.questionId, a]));
  const gradeByQid = new Map(grades.map((g) => [g.questionId, g]));

  const mergedQuestions = questions.map((q) => {
    const answer = answerByQid.get(q.id);
    const grade = gradeByQid.get(q.id);

    if (!answer) {
      return { 
        ...q, 
        status: "unanswered", 
        answer: null 
      };
    }

    return {
      ...q,
      status: "answered",
      answer: {
        transcription: answer.transcription,
        regions: answer.regions,
        score: grade?.score ?? null,
        maxMarks: q.maxMarks,
        verdict: grade?.verdict ?? null,
        feedback: grade?.feedback ?? null,
      },
    };
  });

  return {
    questions: mergedQuestions,
    unmatchedAnswers,
  };
}
