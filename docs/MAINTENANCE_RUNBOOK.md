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

## 7. Maintainer Workflow

Preferred workflow:
1. Create issue tied to roadmap item
2. Branch from `main`
3. Implement + test + docs
4. Open PR and self-review checklist
5. Merge and tag when appropriate
