# Frontend Product Spec

Goal: deliver a polished, high-trust UI that feels as smooth as Anki while modern in design.

## Design direction

- Clean, editorial visual style with high legibility
- Domain-neutral brand language (not language-learning-only)
- Delightful but focused motion (queue transitions, answer reveal)
- Mobile-first responsive review experience

## Main surfaces

1. Home dashboard
- Today's due count
- Retention trend
- Weak-topic highlights
- One-click "Start review"

2. Review player
- Keyboard-first controls
- Prompt/answer reveal flow
- Confidence + correctness input
- Immediate feedback and next-due explanation

3. Card browser (Anki parity anchor)
- Fast search/filter
- Table + detail side panel
- Bulk edit actions

4. Knowledge studio
- Create/edit knowledge points
- Template selection
- AI generation preview and regenerate controls

5. Settings and integrations
- AI provider setup
- Scheduling presets
- Data export/import/backups

## UX quality bar

- Time to interactive < 2.5s on average laptop
- Review action latency < 120ms in local mode
- Fully keyboard-operable review and browser
- Empty/loading/error states intentionally designed

## Suggested frontend stack

- Next.js + TypeScript
- Tailwind + component primitives
- TanStack Query for data sync
- Zustand (or equivalent) for local review state
- Charting for retention analytics

## Delivery phases

F1: shell + dashboard + review player
F2: browser and bulk actions
F3: analytics and settings
F4: final polish and accessibility audit
