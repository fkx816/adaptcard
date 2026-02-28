# adaptcard

FSRS-powered learning backend that stores knowledge points and generates adaptive daily quizzes with AI.

## What it does

- Stores knowledge points (`front`, `back`, context, tags)
- Uses FSRS scheduling to decide next review time
- Generates fresh quiz questions on demand (mock, OpenAI-compatible, or Ollama)
- Scores mastery by answer accuracy and maps it to FSRS ratings
- Saves generated cards for 3 days by default, with optional pinning

## Stack

- TypeScript + Fastify
- SQLite (`better-sqlite3`)
- FSRS (`ts-fsrs`)

## Quick start

```bash
git clone https://github.com/fkx816/adaptcard.git
cd adaptcard
npm install
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
  -d '{"front":"mother","back":"妈妈","tags":["english","family"]}'
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
      {"questionId":"q1","userAnswer":"妈妈"}
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

- Better question types (cloze, multiple choice, reverse recall)
- Explainable mastery model beyond raw accuracy
- User/accounts + multi-tenant data isolation
- Frontend learner UI

## Open-source docs

- `LICENSE`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `CODE_OF_CONDUCT.md`
