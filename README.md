# MEMBRA QR Gateway

MEMBRA QR Gateway is the premium dashboard and tracking interface for the MEMBRA ecosystem.

It provides the visual command center for QR/NFC proof media, artifact ledgers, owner dashboards, advertiser dashboards, scan events, reward status, payout readiness, proof review, wallet boundaries, analytics, and trust signals.

## One-line thesis

MEMBRA QR Gateway turns QR/NFC interactions into visible proof, attribution, analytics, and monetizable campaign intelligence.

## Product role

This repository is the frontend and command-center layer for:

- MEMBRA Ads
- MEMBRA Wear
- MEMBRA Relay
- MEMBRA Wallet
- MEMBRA KPI
- ProofBook records
- QR/NFC scan attribution
- owner and advertiser reporting

## Core modules

- campaign overview
- owner inventory dashboard
- advertiser campaign dashboard
- QR/NFC scan console
- ProofBook ledger view
- payout and reward status
- trust center
- artifact provenance
- wallet status panel
- analytics charts
- mobile preview

## Existing UI foundation

The app uses React, Vite, Tailwind-style components, Lucide icons, glassmorphic dashboard cards, QR-oriented visual language, wallet panels, proof lifecycle concepts, inventory screens, payout views, and trust-center navigation.

## MEMBRA Ads integration

QR Gateway should display:

- campaigns
- media kits
- QR IDs
- NFC IDs
- proof events
- scan events
- owner placements
- advertiser reports
- kit delivery status
- reward eligibility
- claims and disputes

## QR/NFC law

Every QR or NFC tag must route through Membra first.

Direct advertiser URLs break attribution, fraud checks, analytics, proof reporting, and reward eligibility.

## Dashboard doctrine

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

## Development

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Safety and compliance

- Never display private keys or seed phrases.
- Public proof views should show hashes, timestamps, campaign-safe metadata, and consented public data only.
- Raw identity documents, private user data, and sensitive owner details must not be exposed in public UI.
- Campaign results should be reported as analytics, not guaranteed performance.

## Current stage

Strong React/Vite visual foundation. Next step: replace static dashboard data with API-backed MEMBRA Ads, ProofBook, Wallet, Relay, and KPI data.
