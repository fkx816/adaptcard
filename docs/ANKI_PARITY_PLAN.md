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
