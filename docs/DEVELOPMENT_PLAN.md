# adaptcard Development Plan

This document defines the full project roadmap and long-term direction.
It is the primary planning reference for future development and maintenance.

## 1. Vision and Product Scope

adaptcard is an open, general-purpose learning engine where the core unit is a knowledge point, not a static card.

Core principles:
- Knowledge-point-first data model
- FSRS-based review scheduling
- Dynamic quiz generation from AI
- Explainable mastery scoring
- Privacy-first architecture with local model support

Target users:
- Individual learners (language, exams, coding concepts, professional skills)
- Small study groups and training cohorts
- Educators and trainers who need adaptive review workflows
- Product builders embedding adaptive practice into their own apps

## 2. Product North Star and Success Metrics

North Star:
- Increase long-term retention while reducing unnecessary review load.

Primary metrics:
- 7-day active learners
- Review completion rate
- Correct-rate trend by knowledge point
- Time-to-mastery (from create to stable high retention)
- Daily review burden (questions/day)

Quality metrics:
- Quiz generation latency
- Scheduling correctness (FSRS state transitions)
- API reliability and error rate

## 3. Architecture Targets

Current state:
- Single service backend (Fastify + SQLite)
- FSRS integration
- Dynamic quiz generation adapters (mock/openai/ollama)

Target architecture (incremental):
- API service: auth, knowledge point CRUD, review/quiz endpoints
- Scheduler module: FSRS + mastery model
- AI adapter module: OpenAI-compatible + Ollama + prompt templates
- Strategy module: pluggable question and scoring policies by domain
- Storage layer: SQLite -> optional PostgreSQL for scale
- Frontend: learner dashboard and review workflow
- SDK layer: embedding helpers for third-party products

## 4. Phased Roadmap

## Phase 0 - Foundation (done/ongoing)
- Repository bootstrap
- Base API skeleton
- SQLite schema for knowledge points, generated cards, review logs
- FSRS scheduling loop (basic)

Exit criteria:
- A user can complete create -> generate -> submit -> next due flow

## Phase 1 - MVP for real usage (next)
- Add user/account model and data isolation
- Add auth (API key or JWT)
- Add richer question types (cloze, multiple choice, reverse recall)
- Add deterministic scoring strategy and answer normalization rules
- Add card pin/unpin and cleanup policy controls
- Add API validation and standardized error responses

Exit criteria:
- Single user can use daily with stable behavior and no manual DB work

## Phase 2 - Learning intelligence
- Mastery model v2 (accuracy + confidence + response time)
- Review analytics endpoints (retention trend, weak point clusters)
- Prompt quality tuning by topic type
- Retry strategy when AI generation fails
- Optional hybrid mode (template-first + AI augmentation)

Exit criteria:
- Better retention metrics than fixed-card baseline in small trials

## Phase 3 - User experience
- Web frontend with:
  - Today queue
  - Quiz player
  - Review history
  - Mastery heatmap
- Daily/weekly progress reports
- Import/export and backup tools

Exit criteria:
- End-to-end usage without API tools

## Phase 4 - Open-source maturity
- CI pipeline (lint/test/build)
- Versioned releases and changelog policy
- Plugin-style AI adapters
- Contributor-friendly dev tooling and starter issues
- Security hardening and dependency policy

Exit criteria:
- Reliable external contributions and predictable release cadence

## 5. Engineering Standards

Coding standards:
- TypeScript strict mode
- Runtime validation with zod
- Keep domain logic in services, not routes

Testing strategy:
- Unit tests for scheduler, mastery mapping, answer scoring
- Integration tests for API flow with test DB
- Contract tests for AI adapters (mocked network)

Reliability:
- Structured logs for generation/review paths
- Idempotency for review submissions where practical
- Explicit migration management

Security:
- No secrets in repo
- Principle of least privilege for tokens
- Security disclosure handled via SECURITY.md

## 6. Data Evolution Plan

Current schema:
- knowledge_points
- generated_cards
- review_logs

Planned additions:
- users
- decks/collections
- review_sessions
- analytics_snapshots

Rules:
- All schema changes must include forward migration
- Keep historical review logs append-only
- Preserve FSRS fields for reproducibility

## 7. AI Strategy

Provider priority:
1) local-first (Ollama)
2) OpenAI-compatible cloud
3) mock fallback for development

Model quality control:
- Prompt versioning
- JSON schema constraints
- Safety and hallucination checks for generated answers

Operational constraints:
- Timeouts and retries per provider
- Graceful fallback to simple template-based questions

## 8. Governance and Release Rhythm

Cadence:
- Weekly planning issue update
- Bi-weekly minor release
- Patch release on critical fixes

Branching:
- main: stable
- feature/*: feature branches
- fix/*: hotfix branches

Definition of done:
- Build passes
- Tests pass (where applicable)
- Docs updated
- Migration included (if schema changes)

## 9. Immediate Next Tasks (Top 10)

1. Add auth and user isolation
2. Expand automated tests to include review flow integration and route-level validation coverage
3. Implement deck/collection model
4. Implement question type strategy
5. Add review session tracking endpoint
6. Add CI workflow
7. Add OpenAPI spec draft
8. Start polished frontend implementation from `docs/FRONTEND_PRODUCT_SPEC.md`
9. Add telemetry events for product metrics
10. Add API idempotency guard for quiz submission

### 2026-02-28 Maintenance update

Completed this cycle:
- Implemented deterministic answer normalization in scoring (case/diacritics/punctuation/article handling + numeric equivalence).
- Added automated tests for answer evaluation behavior.
- Added standardized API error envelope and explicit error codes for known failures.

Next cycle focus:
- Build deck and note/card split baseline for Anki parity M1.
- Add end-to-end integration tests for create -> generate -> submit -> next due.
- Draft OpenAPI spec with error response schemas aligned to current handlers.

## 10. Strategic expansion tracks

Track A - Anki-level completeness:
- Follow `docs/ANKI_PARITY_PLAN.md` for browser, deck, note/card, and advanced review controls.

Track B - One-click deployment:
- Follow `docs/DEPLOYMENT_BLUEPRINT.md` to support 1Panel and compose-first deployment.

Track C - Premium project presentation:
- Maintain rich docs, diagrams, and visual assets in README and `docs/assets/`.

Track D - Ecosystem growth:
- Publish API/SDK guidance and extension hooks for third-party builders.

## 11. Non-goals (for now)

- Heavy social/community features
- Native mobile app before web workflow stabilizes
- Complex enterprise admin features

## 12. Maintenance Ownership Notes

When extending features:
- Update this plan if priorities or milestones change
- Keep architecture and migration notes in sync
- Prefer small PRs tied to roadmap items
