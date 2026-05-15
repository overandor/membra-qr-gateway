# MEMBRA Module Contract — QR Gateway

## Role

QR/NFC artifact gateway for MEMBRA. Gives physical-world assets, listings, campaigns, media kits, wearables, relay jobs, and proof objects a scannable identity and public verification page.

## System inputs

- artifact creation requests
- subject type and subject ID
- destination URL
- owner or campaign references
- scan events

## System outputs

- artifact IDs
- artifact hashes
- QR URLs
- scan records
- public verification pages
- ProofBook-compatible scan events

## Health

```text
GET /api/health
```

## Replit role

`service`

Runs as the scannable provenance layer behind MEMBRA KPI and the MEMBRA OS website.

## Production boundary

QR/NFC scans are interaction records. They are not payment instructions, custody events, or guaranteed campaign performance.
