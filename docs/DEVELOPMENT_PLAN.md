# adaptcard Development Plan

This document defines the full project roadmap and long-term direction.
It is the primary planning reference for future development and maintenance.

## 1. Vision and Product Scope

adaptcard is an adaptive learning system where the core unit is a knowledge point, not a static card.

Core principles:
- Knowledge-point-first data model
- FSRS-based review scheduling
- Dynamic quiz generation from AI
- Explainable mastery scoring
- Privacy-first architecture with local model support

Target users:
- Individual learners (language, exams, coding concepts)
- Small study groups
- Educators who need adaptive review workflows

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
- Storage layer: SQLite -> optional PostgreSQL for scale
- Frontend: learner dashboard and review workflow

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
2. Add test framework (Vitest) and first critical tests
3. Implement deck/collection model
4. Implement question type strategy
5. Add robust scoring normalization
6. Add review session tracking endpoint
7. Add CI workflow
8. Add OpenAPI spec draft
9. Add simple frontend prototype
10. Add telemetry events for product metrics

## 10. Non-goals (for now)

- Heavy social/community features
- Native mobile app before web workflow stabilizes
- Complex enterprise admin features

## 11. Maintenance Ownership Notes

When extending features:
- Update this plan if priorities or milestones change
- Keep architecture and migration notes in sync
- Prefer small PRs tied to roadmap items
