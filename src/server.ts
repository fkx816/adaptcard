import Fastify from "fastify";
import { config } from "./config.js";
import { registerKnowledgePointRoutes } from "./routes/knowledge-point-routes.js";
import { registerQuizRoutes } from "./routes/quiz-routes.js";

const app = Fastify({ logger: true });

app.get("/health", async () => ({ ok: true, service: "adaptcard" }));

await app.register(registerKnowledgePointRoutes);
await app.register(registerQuizRoutes);

try {
  await app.listen({ port: config.port, host: "0.0.0.0" });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
