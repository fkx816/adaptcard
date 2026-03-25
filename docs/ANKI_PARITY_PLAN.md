# Anki Parity Plan

This document defines how adaptcard reaches Anki-level completeness while keeping adaptcard's adaptive AI strengths.

## Product objective

Match Anki on reliability and review control, then exceed it with dynamic assessment and open engine extensibility.

## Parity dimensions

1. Card and note management completeness
2. Review workflow speed and keyboard control
3. Search and inspectability of stored data
4. Import/export and backup confidence
5. Plugin/extensibility ecosystem

## Feature matrix roadmap

## P0 - Critical parity baseline
- Deck/collection model with hierarchy
- Note templates (basic, cloze, reverse)
- Card browser with filtering/sorting
- Daily limits and queue controls
- Tag management and bulk actions
- Undo last review action

## P1 - Advanced parity
- Suspended/buried states
- Filtered/custom study sessions
- Leech detection and handling
- Detailed review history timeline per card/note
- Media attachment support (images/audio)

## P2 - Power-user parity+
- Custom scheduling presets per deck
- Config profiles and inheritance
- Advanced browser query language
- Plugin hooks (generation, scoring, export)
- Team and shared deck workflows

## Data model additions for parity

Required entities:
- users
- decks (hierarchical)
- notes
- card_templates
- cards
- card_reviews
- study_sessions
- media_assets

Compatibility goals:
- Preserve reproducible scheduling state
- Maintain append-only review history
- Support deterministic export/import

## Browser and inspectability requirements

Card Browser MVP:
- Search by front/back/tag/deck/state/due date
- Sort by due/reps/lapses/stability
- Bulk operations (retag, suspend, move deck)
- Open card detail with full review logs

Advanced browser:
- Saved filters
- Query language (tag:, deck:, due:, state:)
- CSV export of search results

## Non-negotiable UX constraints

- Keyboard-first review loop
- Sub-100ms local navigation in browser views
- Review actions always reversible within current session
- Clear explanation for each due decision (FSRS explainability)

## Milestones and acceptance

M1: Browser + decks + notes/card split complete
M2: Full review controls comparable to Anki daily usage
M3: Import/export and advanced query support complete
M4: Plugin API alpha and public extension docs

## 2026-02-28 progress note

- Review scoring reliability improved with deterministic normalization rules and unit test coverage.
- API failure modes now return stable machine-readable error codes, which unblocks future browser-side error UX.

## 2026-03-03 progress note (Run A)

- Added review-session persistence and APIs, establishing an audit trail foundation for future browser history and undo workflows.
- Quiz submissions can now bind to an active review session, enabling session-level stats accumulation.
- M1 priority remains unchanged: decks + notes/cards split are still the critical parity gap.

## 2026-03-03 progress note (Run B)

- Delivered deck hierarchy baseline APIs and storage, closing the first critical M1 parity item from P0.
- Added guardrails for invalid deck parent assignment and leaf-only delete behavior.
- Critical parity gap is now concentrated on notes/cards split and browser-grade filtering/sorting UX.

## 2026-03-06 progress note (Run C)

- Added integration-level route tests for deck hierarchy behavior, covering create/detail/delete constraints and invalid parent assignment.
- Promoted app bootstrap into a reusable `buildApp()` entrypoint to support parity-focused endpoint verification.
- M1 deck baseline now has regression protection; next parity blocker is notes/cards model separation with browser query primitives.

## 2026-03-09 progress note (Run D)

- Delivered notes/cards baseline split with deck linkage and default card creation on note insertion.
- Shipped browser query MVP endpoint for cards (`search`, `deck`, `state`, `sort`, `pagination`) with integration tests.
- M1 parity blocker shifted from structural data model to control surface parity (bulk actions + suspend/bury + undo).

## 2026-03-10 progress note (Run E)

- Delivered card suspend/unsuspend control endpoints with integration coverage and stable error contract behavior.
- Closed one major P1 control item (`Suspended/buried states`) for suspend/unsuspend baseline; bury and undo remain.
- Primary parity blockers are now undo-last-review and browser bulk operations.

## 2026-03-13 progress note (Run F)

- Delivered browser bulk action baseline with `POST /cards/bulk/move-deck` and `POST /cards/bulk/retag`.
- Added integration coverage for deck migration + retag workflows and missing target deck protection.
- M1 blocker narrows to undo-last-review + OpenAPI publication for contract reliability.

## 2026-03-16 progress note (Run G)

- Delivered session-level undo control via `POST /review-sessions/:id/undo-last-review` for active sessions.
- Added transactional rollback semantics: restore pre-review FSRS fields, remove latest session review log, and decrement session counters atomically.
- Added integration test coverage for end-to-end undo correctness after quiz submission.
- M1 parity is now functionally complete on review controls baseline; next parity risk is contract maturity (`openapi.yaml`) and browser saved filters.

## 2026-03-19 progress note (Run H)

- Delivered saved filter/query preset scaffold for card browser workflows (`POST /cards/filters`, `GET /cards/filters`, `GET /cards/filters/:id/apply`).
- Added persistence + integration tests for filter create/list/apply, covering missing-filter guardrail (`CARD_FILTER_NOT_FOUND`).
- Published initial `docs/openapi.yaml` draft for card browser contract visibility.
- M1 now includes repeatable browser triage scaffolding; next parity acceleration is note template expansion (`cloze`/`reverse`) and deeper contract coverage.

## 2026-03-22 progress note (Run I)

- Delivered note template parity baseline in code paths: `reverse` now creates mirrored card pairs and `cloze` expands indexed cards from `{{cN::...}}` markers.
- Added integration tests for reverse/cloze card expansion plus validation guardrail when cloze markup is missing.
- Expanded OpenAPI route coverage to the full integration-tested API surface and added `check:openapi` drift checks.
- P0 template coverage is now functionally present (`basic`, `reverse`, `cloze`); next parity gap shifts to browser rendering fidelity and filtered/custom study controls.

## 2026-03-25 progress note (Run J)

- Implemented scoped custom study session baseline: `POST /review-sessions/start` now accepts `scope` (`deckId`, `tags`, `state`, `dueBefore`, `dueAfter`) and persists it.
- Added scoped queue endpoint `GET /review-sessions/:id/queue` to return ordered card candidates matching the session scope.
- Added integration coverage for scope persistence + queue filtering behavior and missing-session guardrail.
- P1 filtered/custom study control has moved from plan-only to working API baseline; next parity gap is rendered prompt/answer helpers for reverse/cloze card display.
