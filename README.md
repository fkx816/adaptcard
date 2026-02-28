# adaptcard

An open-source FSRS-powered learning tool that turns knowledge points into adaptive, AI-generated daily quizzes.

## Why adaptcard

Traditional flashcards are static. adaptcard treats each knowledge point as a living unit:
- Store core knowledge points in a durable database.
- Generate fresh quiz items on demand (daily and per review event).
- Estimate mastery from quiz performance.
- Schedule reviews with FSRS for efficient spaced repetition.
- Support local AI models for privacy and offline-friendly workflows.

## Core features

- Knowledge-point-first data model
- FSRS-based review scheduling
- Daily dynamic quiz generation
- 3-day ephemeral generated cards (with optional long-term save)
- Mastery scoring from answer accuracy
- Pluggable AI backend (cloud API or local model)

## Planned architecture

- `core/` - scheduling, mastery scoring, review logic
- `ai/` - prompt templates and model adapters
- `storage/` - knowledge point and card persistence
- `api/` - service endpoints
- `ui/` - learner interface

## Quick start (placeholder)

This repository is under active bootstrapping.

```bash
git clone https://github.com/<your-username>/adaptcard.git
cd adaptcard
```

## Open-source readiness

- License: MIT
- Contribution guide: see `CONTRIBUTING.md`
- Security policy: see `SECURITY.md`
- Code of conduct: see `CODE_OF_CONDUCT.md`

## Roadmap

- [ ] Define v0 data schema for knowledge points and generated cards
- [ ] Implement FSRS scheduler integration
- [ ] Implement mastery scoring strategy
- [ ] Add first AI adapter (OpenAI-compatible API)
- [ ] Add first local model adapter (Ollama)
- [ ] Ship CLI prototype

## Status

Early-stage MVP planning and repository setup.
