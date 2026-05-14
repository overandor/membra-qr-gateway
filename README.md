# MEMBRA QR Gateway

**MEMBRA QR Gateway is the buyer-visible dashboard and QR/NFC interface for MEMBRA Labs and the MEMBRA Proof Network.**

It presents proof activity, public wallet surfaces, artifact provenance, QR/NFC media, scan/tap activity, KPI cards, and dashboard views for physical-world monetization workflows.

## Company Context

- Company: **MEMBRA Labs**
- Flagship product: **MEMBRA Proof Network**
- Module: **MEMBRA QR Gateway**
- Category: React dashboard, QR/NFC interface, provenance UI, proof-commerce visibility layer

## One-Line Thesis

MEMBRA QR Gateway turns QR/NFC interactions into visible proof, attribution, analytics, and monetizable campaign intelligence.

## Product Role

The QR Gateway is the visual command center for MEMBRA Proof Network.

It should show:

- campaign proof status
- QR/NFC identifiers
- scan/tap activity
- wallet/payment boundary status
- artifact provenance
- owner/campaign/report panels
- live event logs
- KPI cards
- mobile preview states
- reward eligibility and payout readiness

## Current Repository Contents

- React/Vite frontend package
- Tailwind-style dashboard UI direction
- QR/provenance/product dashboard concept
- KPI cards and event-stream visual concept
- wallet panels and proof lifecycle concepts
- owner, advertiser, payout, and trust-center navigation concepts

## Installation

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
npm run preview
```

## Integration Path

The dashboard should consume APIs from:

| Repo | Data source |
|---|---|
| `Membra_ads` | owners, advertisers, campaigns, media kits, proof events, QR/NFC scans |
| `Membra_kpi` | owner, advertiser, campaign, proof, and investor metrics |
| `Membra_wallet` | funding status, reward eligibility, payout state, wallet handoff links |
| `Membra_proofbook` | hash records, proof ledger entries, verified reports |
| `Membra_demo_data` | seeded demo scenarios for buyer walkthroughs |

## Product Demo Target

The dashboard should make this flow visible:

1. campaign created
2. QR/NFC kit generated
3. proof submitted
4. proof reviewed
5. scan/tap recorded
6. payout eligibility updated
7. KPI report generated

## QR/NFC Law

Every QR or NFC tag must route through MEMBRA first.

Direct advertiser URLs break attribution, fraud checks, analytics, proof reporting, and reward eligibility.

## Dashboard Doctrine

A campaign is not real until the dashboard can show:

1. who funded it
2. what creative was approved
3. which owner accepted it
4. which kit was generated
5. which QR or NFC identity was assigned
6. what proof was submitted
7. whether the proof was approved
8. how many scans or taps occurred
9. whether reward release is eligible
10. what audit trail exists

## Design System

Recommended company visual language:

- dark charcoal background
- orange/gold/bronze highlights
- glassmorphic proof cards
- thin borders
- QR/NFC-centered artifact cards
- audit-log panels
- mobile preview frame
- investor-grade KPI surfaces

## Safety Rules

- never display private keys or seed phrases
- never expose raw KYC documents
- never expose private memories or private user data
- show only consented metadata, hashes, timestamps, and proof states
- clearly distinguish demo data from live customer data
- report campaign analytics, not guaranteed advertiser performance

## Status

Frontend prototype package. Highest priority is connecting it to `Membra_ads` and `Membra_demo_data` to create a clean buyer-facing demo.