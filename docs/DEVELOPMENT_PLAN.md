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

### 2026-03-03 Maintenance update (Run A)

Completed this cycle:
- Implemented review session tracking endpoints (`start`, `get`, `finish`) and persistence model.
- Extended quiz submission to optionally attach `reviewSessionId` so scoring updates session progress.
- Upgraded README workflow quality with a guided session-based API path and production-readiness snapshot.

Priority shifts:
- Keep M1 parity focus, but move review analytics groundwork to active because session data is now recorded.
- Treat OpenAPI publishing as immediate follow-up to lock new review session contracts.

Next cycle focus:
- Implement deck entity baseline (CRUD + lightweight hierarchy field) for M1 parity.
- Add integration tests for session flow: start -> generate -> submit(with session) -> finish.
- Publish initial `openapi.yaml` including error envelope and review session endpoints.

### 2026-03-03 Maintenance update (Run B)

Completed this cycle:
- Implemented deck baseline APIs (`POST/GET/GET by id/PATCH/DELETE`) with parent-child hierarchy support.
- Added persistence model and DB migration for `decks` with parent FK constraints.
- Improved README presentation with MVP feature status and explicit deck workflow examples.

Priority shifts:
- Deck parity moved from planned to shipped baseline under M1.
- Integration and contract verification become higher priority now that deck and review-session contracts are both available.

Next cycle focus:
- Add automated integration tests for deck CRUD and hierarchy constraints.
- Add notes/cards split scaffolding and deck linkage to progress M1 parity.
- Publish `openapi.yaml` for current endpoints (knowledge points, quiz, review sessions, decks).

### 2026-03-06 Maintenance update (Run C)

Completed this cycle:
- Implemented route-level integration test coverage for deck CRUD + hierarchy guardrails (self-parent rejection, non-leaf delete rejection, leaf-first delete flow).
- Refactored app bootstrap into reusable `buildApp()` so API integration tests can run without process-level server boot.
- Improved README presentation quality with an API capability matrix and explicit maintenance cadence note.

Priority shifts:
- Deck baseline is now contract-tested, reducing risk for upcoming note/card model migration.
- Notes/cards split and browser-facing inspectability become the primary M1 parity gap.

Next cycle focus:
- Implement notes and cards base schema + model split, linked to existing decks.
- Add browser-readiness query endpoints (search/sort/pagination primitives) for cards.
- Publish initial `openapi.yaml` and keep it synced with test-covered route contracts.

### 2026-03-09 Maintenance update (Run D)

Completed this cycle:
- Implemented notes/cards baseline schema and persistence (`notes`, `cards`) with deck linkage and indexes for browser-style access patterns.
- Added note creation API that auto-creates an initial card, plus browser-ready card query endpoint with search/filter/sort/pagination primitives.
- Added route-level integration tests for notes + card browser queries and upgraded README API presentation with new endpoint examples.

Priority shifts:
- M1 parity has moved from deck-only to a shipped deck + notes/cards baseline, reducing structural risk for browser delivery.
- Highest remaining M1 gap is now operational card controls (suspend/bury/undo) and OpenAPI contract publication.

Next cycle focus:
- Implement card state operations (suspend/unsuspend and session-level undo-last-review).
- Add bulk browser actions for retag/move deck on note/card sets.
- Publish and validate initial `openapi.yaml` against integration-covered endpoints (decks, notes, cards, sessions).

### 2026-03-10 Maintenance update (Run E)

Completed this cycle:
- Implemented card state control APIs: `POST /cards/:id/suspend` and `POST /cards/:id/unsuspend`.
- Added integration tests for suspend/unsuspend flow and `CARD_NOT_FOUND` error behavior.
- Improved README presentation with explicit card-state API coverage and deterministic unsuspend behavior notes.

Priority shifts:
- Core suspend/unsuspend parity control is now shipped, reducing operational gap in daily review management.
- Highest-value parity gaps are now session-level undo and bulk browser operations (retag/move deck).

Next cycle focus:
- Implement session-level undo-last-review with correctness + FSRS rollback safety checks.
- Add bulk browser actions for retag and deck move on selected note/card sets.
- Publish initial `openapi.yaml` for decks/notes/cards/review sessions and keep it synchronized with integration tests.

### 2026-03-13 Maintenance update (Run F)

Completed this cycle:
- Implemented bulk browser action APIs for card sets: `POST /cards/bulk/move-deck` and `POST /cards/bulk/retag`.
- Added route-level integration tests for bulk move/retag behavior, including `DECK_NOT_FOUND` guardrails.
- Upgraded README presentation quality with an explicit bulk-actions capability row and operator-focused API examples.

Priority shifts:
- Browser parity now includes practical bulk maintenance workflows, reducing friction for deck migrations and tag cleanup.
- M1 parity risk is now concentrated in undo-last-review and contract publication (OpenAPI) rather than CRUD/control surface breadth.

Next cycle focus:
- Implement session-level undo-last-review with review-log + FSRS rollback integrity checks.
- Publish `openapi.yaml` and lock it against integration-covered routes.
- Add card browser saved filters/query presets scaffold for faster repeated operations.

### 2026-03-16 Maintenance update (Run G)

Completed this cycle:
- Implemented session-level rollback API `POST /review-sessions/:id/undo-last-review` with transactional restoration of prior FSRS state.
- Extended review-log detail payload to persist `knowledgePointBefore` snapshot and scoring stats, enabling deterministic undo semantics.
- Added route-level integration coverage for undo flow (submit -> undo -> session counter rollback + knowledge-point state restore).
- Improved README presentation quality with explicit session-safety capability status and practical undo usage guidance.

Priority shifts:
- Core M1 parity blocker (`Undo last review action`) is now shipped for active sessions.
- Highest delivery risk has shifted to API contract publication and browser repeatability UX (saved filters/presets).

Next cycle focus:
- Publish `openapi.yaml` for all integration-tested endpoints and add CI drift checks.
- Add card-browser saved filters/query presets scaffold (persist + list + apply).
- Start note template expansion (`basic`/`cloze`/`reverse`) as the next parity acceleration item.

### 2026-03-19 Maintenance update (Run H)

Completed this cycle:
- Implemented card-browser saved filter scaffold APIs: `POST /cards/filters`, `GET /cards/filters`, `GET /cards/filters/:id/apply`.
- Added persistence for saved presets (`card_browser_filters`) plus route-level integration coverage for create/list/apply and not-found behavior.
- Published initial OpenAPI draft at `docs/openapi.yaml` to document card browser + saved-filter contract.
- Upgraded README presentation with capability matrix updates and operator-facing saved-filter examples.

Priority shifts:
- Browser repeatability UX moved from planned to shipped scaffold, reducing daily triage friction.
- Contract maturity has started (OpenAPI draft published), but coverage depth and drift automation remain the key quality risks.

Next cycle focus:
- Expand note template parity from `basic` to `cloze` and `reverse` with persistence and generation hooks.
- Extend OpenAPI coverage beyond card browser routes to all integration-tested endpoints.
- Add contract drift checks in CI to block undocumented route changes.

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
