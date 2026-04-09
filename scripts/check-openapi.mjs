import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const openapiPath = path.join(root, "docs", "openapi.yaml");
const content = fs.readFileSync(openapiPath, "utf8");

const expectedPaths = [
  "/health",
  "/knowledge-points",
  "/reviews/next",
  "/quiz/generate",
  "/quiz/submit",
  "/review-sessions/start",
  "/review-sessions/{id}",
  "/review-sessions/{id}/finish",
  "/review-sessions/{id}/undo-last-review",
  "/decks",
  "/decks/{id}",
  "/notes",
  "/notes/{id}/review-history",
  "/cards",
  "/cards/{id}/review-history",
  "/cards/{id}/suspend",
  "/cards/{id}/unsuspend",
  "/cards/bulk/move-deck",
  "/cards/bulk/retag",
  "/cards/filters",
  "/cards/filters/{id}/apply"
];

const missing = expectedPaths.filter((p) => !content.includes(`\n  ${p}:`));
if (missing.length > 0) {
  console.error("OpenAPI coverage drift detected. Missing paths:");
  for (const item of missing) {
    console.error(`- ${item}`);
  }
  process.exit(1);
}

console.log(`OpenAPI coverage check passed (${expectedPaths.length} required paths).`);
