import { nanoid } from "nanoid";
import { config } from "../config.js";
import type { QuizQuestion } from "../types.js";

type GenerateInput = {
  front: string;
  back: string;
  context?: string | null;
  count: number;
};

export async function generateQuiz(input: GenerateInput): Promise<QuizQuestion[]> {
  if (config.aiProvider === "openai") {
    return generateOpenAIQuiz(input);
  }
  if (config.aiProvider === "ollama") {
    return generateOllamaQuiz(input);
  }
  return generateMockQuiz(input);
}

function generateMockQuiz(input: GenerateInput): QuizQuestion[] {
  return Array.from({ length: input.count }).map((_, i) => ({
    id: nanoid(10),
    prompt: `Q${i + 1}. What is \"${input.front}\"?`,
    answer: input.back,
    choices: [input.back, "I do not know", "Not related", "Opposite meaning"]
  }));
}

async function generateOpenAIQuiz(input: GenerateInput): Promise<QuizQuestion[]> {
  if (!config.openai.apiKey) {
    throw new Error("OPENAI_API_KEY is required when AI_PROVIDER=openai");
  }
  const prompt = buildPrompt(input);
  const response = await fetch(`${config.openai.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.openai.apiKey}`
    },
    body: JSON.stringify({
      model: config.openai.model,
      temperature: 0.7,
      messages: [{ role: "user", content: prompt }],
      response_format: {
        type: "json_object"
      }
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  return parseQuiz(content, input.count);
}

async function generateOllamaQuiz(input: GenerateInput): Promise<QuizQuestion[]> {
  const prompt = buildPrompt(input);
  const response = await fetch(`${config.ollama.baseUrl}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.ollama.model,
      prompt,
      stream: false,
      format: "json"
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama request failed: ${response.status}`);
  }

  const data = await response.json();
  return parseQuiz(data.response, input.count);
}

function buildPrompt(input: GenerateInput): string {
  return [
    "Generate quiz questions for a learner.",
    `Knowledge point front: ${input.front}`,
    `Reference answer: ${input.back}`,
    input.context ? `Context: ${input.context}` : "",
    `Create ${input.count} concise questions with answers.`,

    "Return JSON only in this shape:",
    '{"questions":[{"prompt":"...","answer":"...","choices":["...","..."]}]}'
  ]
    .filter(Boolean)
    .join("\n");
}

function parseQuiz(raw: string, fallbackCount: number): QuizQuestion[] {
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return generateMockQuiz({ front: "knowledge point", back: "answer", count: fallbackCount });
  }

  const questions = Array.isArray(parsed.questions) ? parsed.questions : [];
  return questions.slice(0, fallbackCount).map((q: any) => ({
    id: nanoid(10),
    prompt: String(q.prompt ?? ""),
    answer: String(q.answer ?? ""),
    choices: Array.isArray(q.choices) ? q.choices.map((v: unknown) => String(v)) : undefined
  }));
}
