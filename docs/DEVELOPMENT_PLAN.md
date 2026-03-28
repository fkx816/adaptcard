# adaptcard Development Plan

This document defines the full project roadmap and long-term direction.
It is the primary planning reference for future development and maintenance.

## 1. Vision and Product Scope

adaptcard is an open, general-purpose learning engine where the core unit is a knowledge point, not a static card.

Core principles:
- Knowledge-point-first data model
- Evidence-based spaced repetition scheduling
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
- Spaced repetition scheduling integration
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

### Phase 0 — Foundation ✅ Done
- Repository bootstrap, base API skeleton
- SQLite schema for knowledge points, generated cards, review logs
- Spaced repetition scheduling loop (basic)

### Phase 1 — M1 Parity ✅ Done
- Review session lifecycle (start / progress / finish)
- Deck hierarchy with guardrails
- Notes/cards model with basic, reverse, cloze templates
- Card browser query primitives (search / filter / sort / paginate)
- Card state controls (suspend / unsuspend)
- Bulk browser actions (move-deck, retag)
- Session undo (atomic rollback of last review action)
- Saved browser filter presets
- OpenAPI draft published and drift-guarded via `npm run check:openapi`

---

### Phase 2 — Study Session Quality (Active)

Goal: make adaptive review more useful and trustworthy for real daily use.

#### 2.1 Filtered / custom study sessions
- ✅ Baseline shipped: start a session scoped by `deckId`, `tags`, `state`, and due-date window
- ✅ Added scoped queue retrieval endpoint (`GET /review-sessions/:id/queue`) for deterministic, session-specific card selection
- Next: add queue-size summary metrics in `/review-sessions/:id` and keyboard-first frontend wiring

#### 2.2 Smarter scheduling
- Surface review load metrics per deck (due count, overdue backlog)
- Add per-knowledge-point mastery trend (accuracy over last N sessions)
- Optional: configurable retention target per deck

#### 2.3 Quiz generation quality
- Prompt versioning and per-domain prompt templates
- Graceful fallback to template-based questions on AI failure
- Optional hybrid mode: AI questions augment a template-first baseline

#### 2.4 Card rendering helpers
- Expose rendered `prompt` and `answer` sides in card/review payloads
- Clients should not need to re-implement cloze/reverse template logic to display cards

Exit criteria: A single user can run a filtered daily session, see their retention trend, and trust that AI failure degrades gracefully.

---

### Phase 3 — Auth and Multi-User ✅ Prerequisite for public launch

Goal: support multiple isolated users on a single deployment.

- User/account model with data isolation
- Auth layer: API key or JWT (OAuth optional)
- Admin endpoint for user management (invite, disable)
- Migration of existing single-user data to user-scoped model

Exit criteria: Two independent users on the same instance cannot see each other's data.

---

### Phase 4 — Frontend Learner Workspace

Goal: end-to-end usage without curl or API clients.

See [`docs/FRONTEND_PRODUCT_SPEC.md`](FRONTEND_PRODUCT_SPEC.md) for full surface area.

Delivery sequence:
- F1: shell + dashboard (today's due count, retention trend) + review player
- F2: card browser and bulk edit actions
- F3: knowledge studio (create / edit / AI preview)
- F4: analytics, settings, data export, accessibility audit

Exit criteria: A non-technical user can complete the full learn→review→track cycle without opening a terminal.

---

### Phase 5 — Developer Platform

Goal: adaptcard becomes infrastructure others build on.

- SDK / client library (TypeScript-first)
- Integration guide and embedding cookbook
- Plugin-style question strategy interface (custom scoring, custom question shapes)
- Webhook hooks for review events (for LMS integration)
- Versioned releases with a changelog policy

Exit criteria: A third-party builder can embed adaptcard review loops into their product using the SDK without reading source code.

---

### Phase 6 — Operational Maturity

Goal: reliable self-hosted and cloud deployment.

- Docker and compose-first packaging
- One-click deploy profiles (Railway, Fly.io, 1Panel)
- CI pipeline: lint / test / build / OpenAPI drift check per PR
- PostgreSQL support for multi-tenant scale
- Security hardening, dependency policy, vulnerability disclosure process

Exit criteria: A new deployer can go from zero to a production instance in under 15 minutes.

---

## 5. Engineering Standards

Coding standards:
- TypeScript strict mode
- Runtime validation with zod
- Keep domain logic in services, not routes

Testing strategy:
- Unit tests for scheduler, mastery mapping, answer scoring
- Integration tests for API flow with test DB
- Contract tests for AI adapters (mocked network)
- OpenAPI drift checks as a CI gate

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
- review_sessions / review_session_items
- decks
- notes / cards
- card_browser_filters

Planned additions:
- users
- analytics_snapshots (retention trend per knowledge point)

Rules:
- All schema changes must include a forward migration
- Keep historical review logs append-only
- Preserve scheduling state fields for reproducibility

## 7. AI Strategy

Provider priority:
1. Local-first (Ollama)
2. OpenAI-compatible cloud
3. Deterministic mock fallback for development

Model quality control:
- Prompt versioning per domain
- JSON schema constraints on generation output
- Safety and hallucination checks for generated answers

Operational constraints:
- Timeouts and retries per provider
- Graceful fallback to template-based questions on AI failure

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
- OpenAPI drift check passes (if routes changed)

## 9. Immediate Next Tasks (post Run I)

Ordered by value and dependency:

1. **Filtered study sessions** — scope by deck / tag / state / due window (`POST /review-sessions/start` extension)
2. **Card rendering helpers** — expose rendered prompt/answer in card payloads for all template types
3. **Mastery analytics endpoints** — per-knowledge-point accuracy trend, per-deck due count and overdue summary
4. **Prompt template versioning** — version field in prompts, domain-aware template selection
5. **OpenAPI depth pass** — full response body schemas + error envelope examples, tighten drift check to method level
6. **CI pipeline** — lint / test / build / OpenAPI drift check on every PR
7. **Auth + user isolation** — API key auth, user-scoped data model, prerequisite for public deployment
8. **Frontend shell (F1)** — dashboard + review player as first frontend milestone
9. **Docker packaging** — compose-first, single-command local deployment
10. **SDK scaffold** — TypeScript client wrapping the OpenAPI contract

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

### 2026-03-22 Maintenance update (Run I)

Completed this cycle:
- Implemented template-aware note creation: `reverse` now creates mirrored `basic` + `reverse` cards, and `cloze` expands into indexed cards (`cloze:1..N`) from `{{cN::...}}` markers.
- Added integration tests covering reverse/cloze generation and cloze validation failure behavior.
- Expanded `docs/openapi.yaml` from card-browser-only draft to the broader integration-tested route surface (knowledge points, quiz, sessions, decks, notes, cards).
- Added `npm run check:openapi` drift guard script to enforce required documented paths.
- Upgraded README presentation with a template behavior matrix and realistic cloze workflow example.

Priority shifts:
- P0 note template parity moved from scaffold to shipped baseline (`basic`/`reverse`/`cloze`).
- Contract visibility risk reduced by broader OpenAPI coverage; next risk is improving schema depth/strictness beyond path-level checks.

Next cycle focus:
- Add card rendering helpers for reverse/cloze preview payloads so browser clients can directly render prompt/answer sides without local template logic.
- Deepen OpenAPI schemas and examples for response bodies + error codes, then tighten drift checks to method-level coverage.
- Start filtered/custom study session baseline (`state + due window + deck scope`) to advance P1 parity.

### 2026-03-25 Maintenance update (Run J)

Completed this cycle:
- Implemented scoped custom study session baseline: `POST /review-sessions/start` now accepts `scope` (`deckId`, `tags`, `state`, `dueBefore`, `dueAfter`) and persists it.
- Added scoped queue endpoint `GET /review-sessions/:id/queue` to return ordered card candidates matching the session scope.
- Added integration coverage for scope persistence + queue filtering behavior and missing-session guardrail.

Priority shifts:
- P1 filtered/custom study control moved from plan-only to shipped baseline API behavior.
- Next highest-value gap shifted to rendered card sides for reverse/cloze browser fidelity.

Next cycle focus:
- Add rendered prompt/answer helpers for reverse/cloze card payloads.
- Deepen OpenAPI response schema strictness for session routes.
- Add pre-review workload metrics to session detail.

### 2026-03-26 Maintenance update (Run K)

Completed this cycle:
- Implemented scoped session workload summary on `GET /review-sessions/:id` with `queueSummary.totalCount`, `queueSummary.dueCount`, and `queueSummary.overdueCount`.
- Added integration tests validating scoped workload metrics and deterministic due/overdue accounting.
- Improved docs/presentation by updating OpenAPI session-detail schema and README examples for workload-aware planning.

Priority shifts:
- Filtered/custom study sessions now cover both queue retrieval and planning visibility.
- Highest remaining parity gap is rendered prompt/answer helpers so clients avoid local template-side reconstruction.

Next cycle focus:
- Add rendered prompt/answer helpers for reverse/cloze in card/session responses.
- Tighten OpenAPI schema depth for queue and undo responses with concrete examples.
- Start frontend keyboard-first wiring for scoped session launch + queue summary display.

### 2026-03-28 Maintenance update (Run L)

Completed this cycle:
- Implemented template-aware card rendering helpers and exposed `rendered.prompt` + `rendered.answer` on both card browser (`GET /cards`) and review queue (`GET /review-sessions/:id/queue`) responses.
- Added renderer unit coverage plus integration assertions for reverse and cloze rendering behavior (target cloze hidden in prompt, revealed in answer).
- Improved docs/presentation quality by updating README with rendered-side usage examples and expanding OpenAPI queue/card schemas (`RenderedCardSides`, queue response reference).

Priority shifts:
- The top filtered-session parity gap (frontend-side template reconstruction) is now closed at API level.
- Next risk shifts to keyboard-first review execution and richer session endpoint contract examples (especially undo payload semantics).

Next cycle focus:
- Implement keyboard-first frontend wiring for scoped session launch and in-session queue navigation.
- Add concrete OpenAPI examples for undo/session queue payloads and error envelopes.
- Start detailed review-history timeline endpoint(s) per card/note to advance P1 inspectability.

## 10. Strategic Expansion Tracks

### Track A — Learner Experience
Deliver a polished frontend that makes adaptcard accessible to non-technical users. Follow `docs/FRONTEND_PRODUCT_SPEC.md` for phase sequence and UX quality bar.

### Track B — Developer Platform
Make adaptcard the infrastructure layer other products are built on. Goals: TypeScript SDK, embedding cookbook, pluggable question strategy interface, webhook events, versioned releases.

### Track C — Operational Maturity
Enable reliable self-hosted and cloud deployment. Goals: Docker/compose packaging, one-click deploy profiles (Railway, Fly.io, 1Panel), CI/CD pipeline, PostgreSQL backend option, security hardening.

### Track D — Learning Intelligence
Deepen the scheduling and analytics surface. Goals: mastery trend analytics, per-deck retention reporting, configurable retention targets, hybrid AI+template generation modes.

## 11. Non-Goals (for now)

- Heavy social/community features (social leaderboards, public sharing)
- Native mobile app before web workflow stabilizes
- Complex enterprise admin and SSO features

## 12. Maintenance Ownership Notes

When extending features:
- Update this plan if priorities or milestones change
- Keep architecture and migration notes in sync
- Prefer small PRs tied to roadmap items
- Run `npm run check:openapi` before merging any route changes
