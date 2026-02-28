export type QuizQuestion = {
  id: string;
  prompt: string;
  answer: string;
  choices?: string[];
};

export type GeneratedQuiz = {
  cardId: string;
  knowledgePointId: string;
  generatedAt: string;
  expiresAt: string;
  questions: QuizQuestion[];
};

export type SubmitAnswer = {
  questionId: string;
  userAnswer: string;
};
