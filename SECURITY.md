# Security Policy

## Reporting a vulnerability

Please do not open public issues for sensitive security reports.

Report vulnerabilities privately to project maintainers via GitHub Security Advisories.
Include:

- Affected component
- Reproduction steps
- Potential impact
- Suggested mitigation (if any)

## Scope

Security concerns include:

- Secret leakage (tokens, keys, credentials)
- Access control issues
- Data exposure in logs or exports
- Dependency vulnerabilities with realistic exploit paths

## Handling secrets

- Never commit `.env` files.
- Use environment variables for runtime secrets.
- Rotate exposed secrets immediately.

## Support window

During early development, only the latest main branch is supported for fixes.
