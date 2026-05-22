# Security Policy

## Supported Versions

The following versions of MEMBRA QR Gateway currently receive security updates.

| Version | Status              | End of Support  |
|---------|---------------------|-----------------|
| 1.1.x   | Actively supported  | TBD             |
| 1.0.x   | Critical fixes only | 2026-08-17      |
| < 1.0   | Not supported       | Ended           |

We strongly recommend running the latest patch release of 1.1.x in production.
Older releases will not receive security patches and should be upgraded promptly.

---

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Please report all security vulnerabilities by email to:

**security@membra.io**

### PGP Encryption (Recommended for High-Severity Reports)

We encourage researchers to encrypt sensitive reports using our PGP public key.

```
Key ID:          [PLACEHOLDER — will be published at https://membra.io/.well-known/security.txt]
Fingerprint:     [PLACEHOLDER — key will be generated and published before 2026-06-01]
Key server:      keys.openpgp.org
```

Until the key is published, send unencrypted reports to security@membra.io and
request our PGP key in the email body; we will respond with it within 24 hours.

### What to Include

Please include as much of the following as possible to help us triage quickly:

- Affected component (API, frontend, smart contract program name, CI pipeline)
- MEMBRA QR Gateway version or commit SHA
- Proof-of-concept, reproduction steps, or a minimal code example
- Observed versus expected behaviour
- Potential impact (data exposure, privilege escalation, fund loss, etc.)
- Your disclosure timeline preferences
- Your contact information (for follow-up questions)

---

## Response SLA

| Severity        | Acknowledgement    | Status Update  | Target Fix           |
|-----------------|--------------------|----------------|----------------------|
| Critical (P0)   | 24 hours           | 48 hours       | 7 calendar days      |
| High (P1)       | 24 hours           | 5 business days| 30 calendar days     |
| Medium (P2)     | 72 hours           | 14 calendar days| 90 calendar days    |
| Low (P3)        | 5 business days    | 30 calendar days| Next planned release|

"Acknowledgement" means we confirm receipt of your report.
"Status update" means we confirm whether the report is accepted or declined
and explain our reasoning.

We will notify you when a fix is deployed and coordinate disclosure timing
with you before publishing any advisory.

---

## Scope

### In Scope

The following assets are in scope for vulnerability reports:

**FastAPI Backend** (`api/` module):
- Authentication bypass (API key, JWT, wallet signature verification)
- Authorization / privilege escalation (admin endpoint access)
- SQL injection via raw query construction
- Server-side request forgery (SSRF) via webhook URLs
- Rate-limit bypass
- Information disclosure via API responses
- Stripe webhook signature bypass (payment replay attacks)
- Insecure deserialization or unsafe YAML/JSON parsing

**React Frontend** (`src/`):
- Cross-site scripting (XSS)
- Cross-site request forgery (CSRF)
- Authentication token exposure via localStorage or logs
- Wallet address leakage beyond what the user explicitly approved
- Open redirect attacks via `destination_url` parameters

**Anchor Smart Contract Programs** (`protocol/programs/`):
- `membra_ido` — unauthorized token purchase, finalization bypass, refund drain
- `membra_rebase` — unauthorized epoch trigger, oracle price manipulation, circuit-breaker bypass
- `membra_rewards` — unauthorized reward drain, lock period bypass, early-exit penalty bypass
- `membra_governance` — quorum bypass, timelock bypass, unauthorized proposal execution, signer spoofing
- `membra_attestation` — authority spoofing, fake attestation injection, stake drain, slash manipulation, PDA collision

**CI/CD Pipeline** (`.github/workflows/`):
- Supply-chain attacks on workflow dependencies
- Secret exposure via log output or artifact uploads

**QR Artifact Integrity**:
- SHA-256 hash collision attacks enabling artifact substitution
- QR redirect hijacking (changing `destination_url` after registration)

### Out of Scope

The following are explicitly out of scope and will not be treated as security issues:

- Vulnerabilities in third-party services (Stripe infrastructure, Solana validator network, Pyth oracle, Google Fonts CDN)
- Social engineering attacks targeting MEMBRA staff
- Physical security of hosting infrastructure
- Volumetric denial-of-service requiring more than 10 Gbps of traffic
- Theoretical vulnerabilities with no demonstrated, practical exploit path
- Issues in unmaintained forks or unofficial deployments of this codebase
- Public information about wallet addresses already visible on-chain (Solana is a public ledger)
- Self-XSS (attacker must be able to affect other users to be in scope)
- Issues requiring a compromised Solana validator supermajority (> 66%)
- Missing HTTP security headers that have no practical exploit in this deployment context

---

## Responsible Disclosure Process

1. Researcher discovers a vulnerability and sends an (optionally encrypted) report to security@membra.io.
2. MEMBRA sends an acknowledgement within 24 hours for Critical/High issues; 72 hours for Medium/Low.
3. MEMBRA triages the report, determines severity, and communicates accept/decline within the Status Update SLA.
4. If accepted, MEMBRA develops a fix on a private branch, tests it in staging, and prepares a CVE if warranted.
5. MEMBRA coordinates a disclosure date with the reporter — we aim for 90 days from report date for non-critical issues; 7 days for Critical.
6. Fix is deployed to all supported production environments.
7. A public advisory is published in this repository under `security/advisories/` with credit to the reporter (unless anonymity is requested).
8. For on-chain programs, a program upgrade authority key is used to deploy the patched binary; the old program is flagged in our documentation.

We follow a coordinated disclosure model. We do not pursue legal action against
researchers who act in good faith and follow this policy.

---

## Security Acknowledgements

We maintain a hall of fame for researchers who responsibly disclose valid vulnerabilities:

**https://membra.io/security/hall-of-fame**

There is no cash bug bounty program at this time. We plan to introduce one in a
future release once the protocol reaches a stable mainnet deployment.

---

## Security Defaults and Operator Guidance

MEMBRA QR Gateway ships with the following defaults that production operators must understand:

| Variable                | Default            | Risk if Unset or Weak                      |
|-------------------------|--------------------|--------------------------------------------|
| `JWT_SECRET`            | Empty (disabled)   | JWT auth is disabled; all /api/wallet endpoints unprotected |
| `ADMIN_API_KEY`         | Empty (disabled)   | Admin endpoints (`/api/admin/*`) are unauthenticated |
| `API_KEY_SALT`          | Empty string       | API key hashes use a zero-length salt; weaker HMAC |
| `MEMBRA_EVENT_SECRET`   | Empty (permissive) | HMAC verification on inbound events is skipped |
| `FIELD_ENCRYPTION_KEY`  | Empty (disabled)   | AES-GCM field encryption is disabled; owner_email stored in plaintext |
| `CORS_ORIGINS`          | `[]` (allow all)   | All origins can make cross-origin requests |
| `STRIPE_WEBHOOK_SECRET` | Empty (disabled)   | Stripe webhook signature verification is skipped |

Private keys and seed phrases are **never accepted, stored, or displayed** by any
component of this system. This is enforced in code and documented in artifact
manifests. The consent firewall in the frontend hard-blocks these inputs.
