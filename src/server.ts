import { config } from "./config.js";
import { buildApp } from "./app.js";

const app = await buildApp();

try {
  await app.listen({ port: config.port, host: "0.0.0.0" });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
