# adaptcard

Open Learning Engine for adaptive practice, powered by FSRS scheduling and AI-generated assessment.

## Positioning

adaptcard is designed as a general-purpose learning engine, not a single-purpose flashcard app.
It can power language learning, exam prep, technical training, onboarding, and custom education products.

## What it does

- Stores domain-agnostic knowledge points (`front`, `back`, context, tags)
- Uses FSRS scheduling to decide next review time
- Generates fresh assessments on demand (mock, OpenAI-compatible, or Ollama)
- Scores mastery by answer accuracy and maps it to FSRS ratings
- Saves generated cards for 3 days by default, with optional pinning
- Exposes API-first workflows for product integration

## Stack

- TypeScript + Fastify
- SQLite (`better-sqlite3`)
- FSRS (`ts-fsrs`)

## Quick start

```bash
git clone https://github.com/fkx816/adaptcard.git
cd adaptcard
npm install --include=dev
cp .env.example .env
npm run dev
```

Health check:

```bash
curl http://127.0.0.1:8787/health
```

## Environment variables

- `PORT` - HTTP port
- `DATABASE_PATH` - SQLite path
- `AI_PROVIDER` - `mock` | `openai` | `ollama`
- `OPENAI_BASE_URL` / `OPENAI_API_KEY` / `OPENAI_MODEL`
- `OLLAMA_BASE_URL` / `OLLAMA_MODEL`

See `.env.example`.

## API (MVP)

### 1) Create knowledge point

```bash
curl -X POST http://127.0.0.1:8787/knowledge-points \
  -H 'content-type: application/json' \
  -d '{"front":"binary search","back":"O(log n) divide-and-conquer lookup","tags":["algorithms","cs"]}'
```

### 2) Get next due review item

```bash
curl http://127.0.0.1:8787/reviews/next
```

### 3) Generate quiz for a knowledge point

```bash
curl -X POST http://127.0.0.1:8787/quiz/generate \
  -H 'content-type: application/json' \
  -d '{"knowledgePointId":"<id>","count":3,"pin":false}'
```

### 4) Submit quiz answers

```bash
curl -X POST http://127.0.0.1:8787/quiz/submit \
  -H 'content-type: application/json' \
  -d '{
    "cardId":"<card-id>",
    "answers":[
      {"questionId":"q1","userAnswer":"O(log n) divide-and-conquer lookup"}
    ]
  }'
```

Response includes `correctRate`, mapped `rating`, and `nextDueAt`.

## Project layout

- `src/server.ts` - app entry
- `src/db/` - sqlite + migration
- `src/models/` - persistence access
- `src/services/` - FSRS, quiz generation, review scoring
- `src/routes/` - API routes

## Next milestones

- Better question types (cloze, multiple choice, reverse recall, scenario)
- Explainable mastery model beyond raw accuracy
- User/accounts + multi-tenant data isolation
- Frontend learner UI
- SDK and integration guides for external products

## Planning and maintenance

- Full roadmap: `docs/DEVELOPMENT_PLAN.md`
- Maintenance runbook: `docs/MAINTENANCE_RUNBOOK.md`
- Product positioning: `docs/PRODUCT_POSITIONING.md`

## Open-source docs

- `LICENSE`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `CODE_OF_CONDUCT.md`
