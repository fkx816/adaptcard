# adaptcard Maintenance Runbook

This runbook is for ongoing maintenance after initial build.

## 1. Local Operations

Install and run:
```bash
npm install --include=dev
cp .env.example .env
npm run dev
```

Build:
```bash
npm run build
```

Validation checks:
```bash
npm run lint
npm run test
npm run build
```

Health check:
```bash
curl http://127.0.0.1:8787/health
```

## 2. Routine Maintenance Checklist

Daily/regular:
- Confirm service starts and `/health` is healthy
- Check error logs for quiz generation failures
- Verify DB file growth is reasonable
- Ensure expired unpinned cards are being cleaned up

Weekly:
- Review open issues and roadmap alignment
- Update dependencies (security-focused first)
- Run build and test matrix
- Publish progress notes in README or releases

Monthly:
- Review schema and migration debt
- Audit API/AI token handling and permissions
- Re-evaluate performance bottlenecks

## 3. Incident Playbooks

## AI provider failures
Symptoms:
- quiz generation endpoints fail or time out

Actions:
1. Verify provider endpoint and credentials
2. Switch `AI_PROVIDER=mock` for continuity if needed
3. Capture failing request payload shape (without secrets)
4. Add retry/timeout tuning

## SQLite lock/contention issues
Symptoms:
- intermittent write failures

Actions:
1. Confirm WAL mode active
2. Review concurrent write patterns
3. Consider queueing writes or moving to PostgreSQL

## Scheduling anomalies
Symptoms:
- unexpected due dates or rating behavior

Actions:
1. Validate review logs for affected item
2. Replay score -> rating -> FSRS mapping
3. Add regression test for that edge case

## 4. Backups and Data Safety

Minimum recommendation:
- Daily backup of `data/adaptcard.db`
- Keep at least 7 rolling backups

Restore test:
- Validate backup restore at least monthly

Data rules:
- Do not mutate historical review_logs records
- Use migrations for structural changes

## 5. Release Checklist

Before release:
- Build passes
- Docs updated (README + plan if needed)
- Changelog entries prepared
- Schema migration reviewed

After release:
- Smoke test core flow
- Monitor error logs for 24h
- Tag and record release notes

## 6. Documentation Update Rules

Always update docs when changing:
- API behavior
- schema/migrations
- AI provider integration
- environment variables

Docs to keep aligned:
- `README.md`
- `docs/DEVELOPMENT_PLAN.md`
- `docs/MAINTENANCE_RUNBOOK.md`

## 7. Cycle notes

### 2026-03-03 (Run A)

Completed:
- Added review session tracking API and storage.
- Linked quiz submission flow to optional session progress updates.
- Refreshed README onboarding with a session-oriented review flow.

Next cycle priorities:
- Deck baseline data model and CRUD.
- Session flow integration tests.
- OpenAPI contract publication for current endpoints.

### 2026-03-03 (Run B)

Completed:
- Added deck hierarchy storage and CRUD API surface.
- Added API guardrails for invalid parent assignment and non-leaf deletion.
- Upgraded README presentation with feature status and deck examples.

Next cycle priorities:
- Add integration tests for deck routes and hierarchy constraints.
- Start notes/cards model split with deck linkage.
- Publish OpenAPI contract for shipped endpoints.

### 2026-03-06 (Run C)

Completed:
- Added route-level integration tests for deck CRUD and hierarchy constraints.
- Refactored server bootstrap into `buildApp()` to make integration testing first-class.
- Enhanced README presentation with an API surface matrix and explicit maintenance cadence notes.

Next cycle priorities:
- Implement notes/cards split baseline (schema + model + minimal CRUD linkage to decks).
- Add browser-oriented list/query primitives for card inspectability.
- Publish initial OpenAPI contract and align it with integration test scenarios.

### 2026-03-09 (Run D)

Completed:
- Added `notes` and `cards` schema baseline with deck linkage and browser-query indexes.
- Shipped notes API (`POST /notes`, `GET /notes`) and card browser API (`GET /cards`) with search/filter/sort/pagination.
- Added integration tests covering cross-deck note creation and card browser query behavior.
- Improved README presentation quality with notes/cards capability status and practical API examples.

Next cycle priorities:
- Add card control APIs for suspend/unsuspend and undo-last-review within session scope.
- Add bulk browser actions (retag + move deck) for parity progress.
- Publish initial `openapi.yaml` and keep it in lockstep with integration routes.

### 2026-03-10 (Run E)

Completed:
- Added card state control APIs (`POST /cards/:id/suspend`, `POST /cards/:id/unsuspend`).
- Added integration tests for suspend/unsuspend and card-not-found handling.
- Refreshed README API/presentation sections to expose new controls and deterministic unsuspend behavior.

Next cycle priorities:
- Implement session-level undo-last-review with safe review log/state rollback semantics.
- Add bulk browser actions for retag and deck move to advance parity browser workflows.
- Publish `openapi.yaml` for current route set and align it with integration-tested behavior.

### 2026-03-13 (Run F)

Completed:
- Added bulk browser action APIs (`POST /cards/bulk/move-deck`, `POST /cards/bulk/retag`) for deck migration and metadata cleanup workflows.
- Added route-level integration tests for bulk actions and target-deck validation (`DECK_NOT_FOUND`).
- Upgraded README presentation quality with a bulk-actions capability row and practical operator examples.

Next cycle priorities:
- Implement session-level undo-last-review with transaction-safe rollback semantics.
- Publish and maintain `openapi.yaml` in lockstep with route integration tests.
- Add browser saved-filter/query preset scaffolding to speed repeated triage flows.

### 2026-03-16 (Run G)

Completed:
- Added session-level rollback API `POST /review-sessions/:id/undo-last-review` for active sessions.
- Persisted pre-review knowledge-point snapshot and score stats in review logs to support deterministic undo.
- Added integration test coverage for submit -> undo flow and verified session progress + knowledge-point restoration.
- Refreshed README with explicit session-safety endpoint coverage and undo guidance.

Next cycle priorities:
- Publish `openapi.yaml` and gate route changes with a contract drift check.
- Add saved filters/query presets for card browser workflows.
- Expand note template support (basic/cloze/reverse) to advance P0 parity.

### 2026-03-19 (Run H)

Completed:
- Added saved card-browser filters scaffold APIs (`POST /cards/filters`, `GET /cards/filters`, `GET /cards/filters/:id/apply`).
- Added `card_browser_filters` persistence table and route-level integration coverage for create/list/apply + missing-filter guardrail.
- Published initial OpenAPI contract draft at `docs/openapi.yaml`.
- Upgraded README quality with saved-filter examples and refreshed capability matrix.

Next cycle priorities:
- Expand note template support (`cloze` and `reverse`) with note/card generation paths.
- Extend OpenAPI contract to all integration-tested endpoints, not just card browser surfaces.
- Add CI contract drift checks so route changes require OpenAPI synchronization.

### 2026-03-22 (Run I)

Completed:
- Implemented template-aware note creation: reverse notes now generate mirrored cards, and cloze notes generate indexed cards from cloze markers.
- Added integration tests for reverse/cloze generation and invalid-cloze validation behavior.
- Expanded `docs/openapi.yaml` to include the broader integration-tested API route surface.
- Added `npm run check:openapi` contract drift check.
- Improved README presentation with template matrix + cloze example.

Next cycle priorities:
- Add API-level rendered prompt/answer fields for reverse/cloze browser display.
- Increase OpenAPI schema strictness (typed response bodies + example payloads + error mapping).
- Implement filtered/custom study session baseline to advance parity beyond baseline browser controls.

## 8. Maintainer Workflow

Preferred workflow:
1. Create issue tied to roadmap item
2. Branch from `main`
3. Implement + test + docs
4. Open PR and self-review checklist
5. Merge and tag when appropriate
