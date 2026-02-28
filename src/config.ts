import dotenv from "dotenv";

dotenv.config();

export type AIProvider = "mock" | "openai" | "ollama";

function getEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 8787),
  databasePath: getEnv("DATABASE_PATH", "./data/adaptcard.db"),
  aiProvider: (process.env.AI_PROVIDER ?? "mock") as AIProvider,
  openai: {
    baseUrl: getEnv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
    apiKey: process.env.OPENAI_API_KEY ?? "",
    model: getEnv("OPENAI_MODEL", "gpt-4o-mini")
  },
  ollama: {
    baseUrl: getEnv("OLLAMA_BASE_URL", "http://127.0.0.1:11434"),
    model: getEnv("OLLAMA_MODEL", "qwen2.5:7b")
  }
};
