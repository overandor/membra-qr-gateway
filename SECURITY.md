# Security Policy

## Supported Versions

The following versions of MEMBRA QR Gateway currently receive security updates.

| Version | Status           | End of Support |
|---------|------------------|----------------|
| 1.1.x   | Actively supported | TBD          |
| 1.0.x   | Critical fixes only | 2026-08-17  |
| < 1.0   | Not supported    | Ended          |

We strongly recommend running the latest patch release of 1.1.x in production. Older releases will not receive security patches and should be upgraded promptly.

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Please report security vulnerabilities by email to:

**security@membra.io**

### PGP Encryption (Recommended for High-Severity Reports)

We encourage researchers to encrypt sensitive reports using our PGP public key. Our key fingerprint is:

```
[PGP KEY FINGERPRINT PLACEHOLDER — key will be published at https://membra.io/.well-known/security.txt]
```

Until the key is published, send unencrypted reports to security@membra.io and request our PGP key in the email body; we will respond with it within 24 hours.

### What to Include

Please include as much of the following as possible to help us triage quickly:

- Affected component (API, frontend, smart contract program name, CI pipeline)
- MEMBRA QR Gateway version or commit SHA
- Proof-of-concept, reproduction steps, or a minimal code example
- Observed versus expected behaviour
- Potential impact (data exposure, privilege escalation, fund loss, etc.)
- Your disclosure timeline preferences

### Response SLA

| Severity | Acknowledgement | Status update | Target fix |
|----------|-----------------|---------------|------------|
| Critical (P0) | 24 hours | 48 hours | 7 calendar days |
| High (P1) | 24 hours | 5 days | 30 calendar days |
| Medium (P2) | 72 hours | 14 days | 90 calendar days |
| Low (P3) | 5 business days | 30 days | Next planned release |

"Acknowledgement" means we confirm receipt of your report. "Status update" means we confirm whether the report is accepted or declined and explain our reasoning.

We will notify you when a fix is deployed and coordinate disclosure timing with you.

## Scope

### In Scope

The following assets are in scope for vulnerability reports:

- **FastAPI backend** (`app.py`, `api/` module): authentication bypass, injection attacks, SSRF, insecure deserialization, privilege escalation, rate-limit bypass, information disclosure
- **React frontend** (`src/`): XSS, CSRF, authentication token exposure, wallet address leakage, malicious redirect attacks
- **Anchor smart contract programs** (`protocol/programs/`):
  - `membra_ido` — unauthorized token purchase / finalization
  - `membra_rebase` — unauthorized epoch trigger, oracle manipulation
  - `membra_rewards` — unauthorized reward drain, lock period bypass
  - `membra_governance` — quorum bypass, timelock bypass, unauthorized proposal execution
  - `membra_attestation` — authority spoofing, fake attestation, stake drain, slash manipulation
- **CI/CD pipeline** (`.github/workflows/`): supply-chain attacks, secret exposure in logs
- **QR artifact integrity**: hash collision attacks, QR redirect hijacking
- **Stripe webhook handling**: payment replay, signature bypass

### Out of Scope

The following are explicitly out of scope and will not be treated as security issues:

- Vulnerabilities in third-party services (Stripe, Solana validators, Pyth oracle) that MEMBRA cannot control
- Social engineering attacks against MEMBRA staff
- Physical security of infrastructure
- Denial-of-service attacks that require more than 10 Gbps of traffic
- Theoretical vulnerabilities with no practical exploit path (informational only)
- Issues in unmaintained forks or unofficial deployments of this codebase
- Public information about wallet addresses already visible on-chain
- Self-XSS (an attacker must be able to affect other users)
- Issues requiring a compromised Solana validator majority (>50%)

## Responsible Disclosure Process

1. Researcher discovers a vulnerability and sends an encrypted report to security@membra.io.
2. MEMBRA acknowledges receipt within 24 hours for critical issues (72 hours for others).
3. MEMBRA triages the report and determines severity within the timeframes above.
4. If accepted, MEMBRA develops a fix on a private branch and tests it.
5. MEMBRA coordinates a disclosure date with the researcher — we prefer 90 days from report date for non-critical issues.
6. Fix is deployed across all supported environments.
7. Public advisory is published in this repository under `security/advisories/` with credit to the researcher (unless anonymity is requested).
8. For on-chain programs, a program upgrade is deployed and the old program is flagged.

We follow a coordinated disclosure model. We do not pursue legal action against researchers who act in good faith and follow this policy.

## Security Acknowledgements

We maintain a hall of fame for researchers who responsibly disclose valid vulnerabilities at:

**https://membra.io/security/hall-of-fame**

There is no cash bug bounty program at this time. We aim to introduce one in a future release.

## Security Defaults

MEMBRA QR Gateway ships with the following security defaults that operators should be aware of:

- `JWT_SECRET` must be set explicitly; JWT auth is disabled if the env var is absent.
- `ADMIN_API_KEY` must be set; admin endpoints are unauthenticated if absent.
- `MEMBRA_EVENT_SECRET` must be set; HMAC verification is permissive if absent.
- `FIELD_ENCRYPTION_KEY` must be a 32-byte hex string; AES-GCM field encryption is disabled if absent.
- CORS is set to `allow_origins=["*"]` in the monolith `app.py`; restrict this in production via the `CORS_ORIGINS` environment variable.
- Private keys and seed phrases are never accepted, stored, or displayed by any component of this system. This is enforced in code and documented in artifact manifests.
