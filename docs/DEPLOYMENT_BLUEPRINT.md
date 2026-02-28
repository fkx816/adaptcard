# Deployment Blueprint

This blueprint covers one-click and low-friction deployment options.

## Deployment targets

1. 1Panel App Store style package
2. Docker Compose one-command deployment
3. PaaS options (Railway/Render/Fly.io) with managed DB option
4. Self-host script for VPS with systemd

## Baseline containerization requirements

- Multi-stage Dockerfile (build + runtime)
- Non-root runtime user
- Healthcheck endpoint wired (`/health`)
- Persistent volume for DB and assets
- ENV-driven configuration only

## One-click deploy profile (priority)

For 1Panel:
- Single service: `adaptcard-api`
- Optional service: `adaptcard-web` (when frontend lands)
- Volumes:
  - `/home/node/.openclaw/workspace/adaptcard/data`
- Required env:
  - `PORT`
  - `DATABASE_PATH`
  - `AI_PROVIDER`
  - provider-specific keys

## Compose template requirements

- Include `.env.example` ready defaults
- Add restart policy
- Add resource limits recommendations
- Include comments for local model networking

## Production hardening checklist

- Reverse proxy with TLS
- API auth enabled
- Secrets via panel secret manager, not compose literals
- Daily DB backup and retention policy
- Structured logs shipping optional

## CI/CD release channel

- Build and publish image on tag
- Semantic version tags (`vX.Y.Z`)
- Changelog generated per release

## Delivery milestones

D1: Dockerfile + compose + docs
D2: 1Panel-ready app packaging docs
D3: Hosted deployment guides
D4: Automated image release pipeline
