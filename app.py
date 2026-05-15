"""MEMBRA QR Gateway — proof, wallet, artifact, and scan gateway.

Runtime for registering public QR/NFC artifacts, ingesting canonical MEMBRA events,
recording scan/proof events, exporting registers, and exposing Stripe hooks.
No private keys or seed phrases are accepted or displayed.
"""
from __future__ import annotations

import csv
import datetime as dt
import hashlib
import hmac
import json
import os
import sqlite3
import uuid
from pathlib import Path
from typing import Any

import gradio as gr
import stripe
import uvicorn
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import BaseModel, Field

APP_NAME = "MEMBRA QR Gateway"
APP_VERSION = "1.1.0"
DB_PATH = Path(os.getenv("DB_PATH", "/tmp/membra_qr_gateway.sqlite3"))
APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:7860").rstrip("/")
MEMBRA_EVENT_SECRET = os.getenv("MEMBRA_EVENT_SECRET", "")
PUBLIC_SUPPORT_WALLET = os.getenv("PUBLIC_SUPPORT_WALLET", "")
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
STRIPE_PRICE_ID = os.getenv("STRIPE_PRICE_ID", "")
stripe.api_key = STRIPE_SECRET_KEY or None
api = FastAPI(title=APP_NAME, version=APP_VERSION)


class ArtifactIn(BaseModel):
    owner_email: str = ""
    artifact_title: str
    artifact_type: str = "proofbook"
    destination_url: str
    public_wallet: str = ""
    provenance_notes: str = ""
    consent_scope: str = "public hash, timestamp, QR redirect, consented metadata only"


class CheckoutIn(BaseModel):
    email: str
    artifact_id: str | None = None


class MembraEventIn(BaseModel):
    event_id: str
    event_type: str
    source_module: str
    subject_type: str
    subject_id: str
    owner_id: str | None = None
    correlation_id: str | None = None
    causation_id: str | None = None
    created_at: str
    consent_scope: str | None = None
    risk_level: str = "normal"
    payload: dict[str, Any] = Field(default_factory=dict)
    proof_hash: str | None = None
    signature: str | None = None


def now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


def db() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=30, isolation_level=None)
    conn.row_factory = sqlite3.Row
    return conn


def canonical(payload: dict[str, Any]) -> str:
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False, default=str)


def verify_event_signature(event: dict[str, Any]) -> bool:
    if not MEMBRA_EVENT_SECRET:
        return True
    supplied = event.get("signature") or ""
    unsigned = dict(event)
    unsigned["signature"] = None
    expected = "hmac_sha256:" + hmac.new(MEMBRA_EVENT_SECRET.encode("utf-8"), canonical(unsigned).encode("utf-8"), hashlib.sha256).hexdigest()
    return hmac.compare_digest(supplied, expected)


def init_db() -> None:
    with db() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS artifacts(
          artifact_id TEXT PRIMARY KEY,
          owner_email TEXT,
          artifact_title TEXT,
          artifact_type TEXT,
          destination_url TEXT,
          public_wallet TEXT,
          provenance_notes TEXT,
          consent_scope TEXT,
          artifact_hash TEXT,
          qr_url TEXT,
          status TEXT,
          stripe_session_id TEXT,
          created_at TEXT
        );
        CREATE TABLE IF NOT EXISTS gateway_events(event_id TEXT PRIMARY KEY, artifact_id TEXT, event_type TEXT, payload_json TEXT, created_at TEXT);
        CREATE TABLE IF NOT EXISTS events(
          event_id TEXT PRIMARY KEY,
          event_type TEXT,
          source_module TEXT,
          subject_type TEXT,
          subject_id TEXT,
          owner_id TEXT,
          risk_level TEXT,
          proof_hash TEXT,
          signature TEXT,
          payload_json TEXT,
          status TEXT,
          created_at TEXT,
          ingested_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_qr_events_type ON events(event_type);
        CREATE INDEX IF NOT EXISTS idx_qr_events_subject ON events(subject_type, subject_id);
        """)


init_db()


def artifact_hash(payload: dict[str, Any]) -> str:
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def build_artifact(data: ArtifactIn) -> dict[str, Any]:
    artifact_id = "art_" + uuid.uuid4().hex[:12]
    qr_url = f"{APP_BASE_URL}/g/{artifact_id}"
    public_payload = {
        "artifact_id": artifact_id,
        "artifact_title": data.artifact_title,
        "artifact_type": data.artifact_type,
        "destination_url": data.destination_url,
        "public_wallet": data.public_wallet or PUBLIC_SUPPORT_WALLET,
        "consent_scope": data.consent_scope,
        "provenance_notes": data.provenance_notes,
        "created_at": now(),
    }
    digest = artifact_hash(public_payload)
    manifest = {
        **public_payload,
        "artifact_hash": digest,
        "qr_url": qr_url,
        "status": "registered_pending_external_verification",
        "safety": {
            "private_key_policy": "private keys and seed phrases are never collected, stored, rendered, or requested",
            "onchain_policy": "public ledger should store hashes, timestamps, and consented metadata only",
        },
    }
    with db() as conn:
        conn.execute("INSERT INTO artifacts VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)", (artifact_id, data.owner_email, data.artifact_title, data.artifact_type, data.destination_url, data.public_wallet or PUBLIC_SUPPORT_WALLET, data.provenance_notes, data.consent_scope, digest, qr_url, manifest["status"], None, manifest["created_at"]))
        conn.execute("INSERT INTO gateway_events VALUES(?,?,?,?,?)", ("evt_" + uuid.uuid4().hex[:12], artifact_id, "artifact_registered", json.dumps(manifest, default=str), now()))
    return manifest


def artifact_rows() -> list[dict[str, Any]]:
    with db() as conn:
        rows = conn.execute("SELECT artifact_id,artifact_title,artifact_type,artifact_hash,qr_url,status,created_at FROM artifacts ORDER BY created_at DESC LIMIT 200").fetchall()
    return [dict(r) for r in rows]


def event_rows() -> list[dict[str, Any]]:
    with db() as conn:
        rows = conn.execute("SELECT * FROM events ORDER BY ingested_at DESC LIMIT 500").fetchall()
    return [dict(r) for r in rows]


def export_artifacts() -> str:
    rows = artifact_rows()
    path = "/tmp/membra_qr_artifacts.csv"
    if rows:
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            writer.writeheader(); writer.writerows(rows)
    else:
        Path(path).write_text("artifact_id,artifact_title,status\n", encoding="utf-8")
    return path


def artifact_from_event(data: MembraEventIn) -> dict[str, Any] | None:
    if data.event_type not in {"visibility_confirmed", "qr_artifact_created"}:
        return None
    payload = data.payload or {}
    title = payload.get("artifact_title") or payload.get("title") or f"MEMBRA {data.subject_type} {data.subject_id}"
    destination = payload.get("destination_url") or payload.get("qr_url") or f"{APP_BASE_URL}/g/{data.subject_id}"
    return build_artifact(
        ArtifactIn(
            owner_email=payload.get("owner_email", ""),
            artifact_title=title,
            artifact_type=data.subject_type,
            destination_url=destination,
            public_wallet=payload.get("public_wallet", ""),
            provenance_notes=f"Created from MEMBRA event {data.event_id} ({data.event_type})",
            consent_scope=data.consent_scope or "canonical MEMBRA event envelope and QR provenance metadata only",
        )
    )


def ui_register(owner_email, title, artifact_type, destination_url, public_wallet, provenance_notes, consent_scope):
    try:
        manifest = build_artifact(ArtifactIn(owner_email=owner_email, artifact_title=title, artifact_type=artifact_type, destination_url=destination_url, public_wallet=public_wallet, provenance_notes=provenance_notes, consent_scope=consent_scope))
        return json.dumps(manifest, indent=2), artifact_rows(), export_artifacts()
    except Exception as exc:
        return f"Error: {exc}", artifact_rows(), None


def ui_checkout(email, artifact_id):
    if not STRIPE_SECRET_KEY or not STRIPE_PRICE_ID:
        return "Stripe is not configured."
    session = stripe.checkout.Session.create(mode="payment", customer_email=email, line_items=[{"price": STRIPE_PRICE_ID, "quantity": 1}], success_url=f"{APP_BASE_URL}/?checkout=success", cancel_url=f"{APP_BASE_URL}/?checkout=cancelled", metadata={"artifact_id": artifact_id or ""})
    if artifact_id:
        with db() as conn:
            conn.execute("UPDATE artifacts SET stripe_session_id=?, status=? WHERE artifact_id=?", (session.id, "funding_checkout_created", artifact_id))
    return session.url


@api.get("/api/health")
def health():
    return {"ok": True, "app": APP_NAME, "version": APP_VERSION, "stripe_configured": bool(STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET and STRIPE_PRICE_ID)}


@api.get("/api/ready")
def ready():
    warnings = [] if MEMBRA_EVENT_SECRET else ["MEMBRA_EVENT_SECRET not configured; signed event verification is permissive"]
    return {"ok": True, "warnings": warnings, "artifact_count": len(artifact_rows()), "event_count": len(event_rows())}


@api.get("/api/artifacts")
def list_artifacts():
    return {"artifacts": artifact_rows()}


@api.post("/api/artifacts")
def create_artifact(data: ArtifactIn):
    return build_artifact(data)


@api.post("/api/events/ingest")
def ingest_event(data: MembraEventIn):
    event = data.model_dump()
    if not verify_event_signature(event):
        raise HTTPException(401, "invalid event signature")
    with db() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO events VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (data.event_id, data.event_type, data.source_module, data.subject_type, data.subject_id, data.owner_id, data.risk_level, data.proof_hash, data.signature, json.dumps(event, default=str), "ingested", data.created_at, now()),
        )
    artifact = artifact_from_event(data)
    return {"ok": True, "event_id": data.event_id, "artifact": artifact}


@api.get("/api/events")
def list_events():
    return {"events": event_rows()}


@api.post("/api/stripe/create-checkout-session")
def checkout(data: CheckoutIn):
    return {"url": ui_checkout(data.email, data.artifact_id or "")}


@api.post("/api/stripe/webhook")
async def stripe_webhook(request: Request, stripe_signature: str | None = Header(default=None)):
    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(500, "STRIPE_WEBHOOK_SECRET is not configured")
    body = await request.body()
    try:
        event = stripe.Webhook.construct_event(body, stripe_signature, STRIPE_WEBHOOK_SECRET)
    except Exception as exc:
        raise HTTPException(400, str(exc))
    obj = event["data"]["object"]
    artifact_id = obj.get("metadata", {}).get("artifact_id")
    if artifact_id and event["type"] == "checkout.session.completed":
        with db() as conn:
            conn.execute("UPDATE artifacts SET status=? WHERE artifact_id=?", ("funded_pending_notary_or_public_release", artifact_id))
            conn.execute("INSERT INTO gateway_events VALUES(?,?,?,?,?)", ("evt_" + uuid.uuid4().hex[:12], artifact_id, event["type"], json.dumps(obj, default=str), now()))
    return JSONResponse({"received": True})


@api.get("/g/{artifact_id}")
def gateway_scan(artifact_id: str):
    with db() as conn:
        row = conn.execute("SELECT destination_url,artifact_hash FROM artifacts WHERE artifact_id=?", (artifact_id,)).fetchone()
        conn.execute("INSERT INTO gateway_events VALUES(?,?,?,?,?)", ("evt_" + uuid.uuid4().hex[:12], artifact_id, "scan", "{}", now()))
    if not row:
        raise HTTPException(404, "Artifact not found")
    return PlainTextResponse(f"MEMBRA gateway scan recorded for {artifact_id}. Hash: {row['artifact_hash']}. Destination: {row['destination_url']}")


with gr.Blocks(title=APP_NAME) as demo:
    gr.Markdown("# MEMBRA QR Gateway\nPublic artifact, wallet, provenance, event ingestion, and QR/NFC gateway. Never enter private keys or seed phrases.")
    with gr.Row():
        owner_email = gr.Textbox(label="Owner email")
        title = gr.Textbox(label="Artifact title")
    with gr.Row():
        artifact_type = gr.Dropdown(["proofbook", "wallet", "campaign", "diagram", "pitch", "execution_trigger", "wearable", "relay", "listing"], value="proofbook", label="Artifact type")
        destination_url = gr.Textbox(label="Destination URL")
    public_wallet = gr.Textbox(label="Public wallet address only", value=PUBLIC_SUPPORT_WALLET)
    provenance_notes = gr.Textbox(label="Provenance notes", lines=3)
    consent_scope = gr.Textbox(label="Consent scope", value="public hash, timestamp, QR redirect, consented metadata only")
    register = gr.Button("Register gateway artifact", variant="primary")
    manifest = gr.Code(label="Gateway manifest", language="json")
    table = gr.Dataframe(label="Artifact register", value=artifact_rows, interactive=False)
    export = gr.File(label="CSV export")
    with gr.Tab("Events"):
        gr.Markdown("Canonical MEMBRA events arrive through `/api/events/ingest`. Confirmed visibility and QR artifact events can create artifacts.")
        gr.Dataframe(label="Event envelopes", value=event_rows, interactive=False)
    with gr.Row():
        checkout_email = gr.Textbox(label="Checkout email")
        checkout_artifact = gr.Textbox(label="Artifact ID")
    checkout_btn = gr.Button("Create Stripe checkout")
    checkout_url = gr.Textbox(label="Checkout URL")
    register.click(ui_register, [owner_email, title, artifact_type, destination_url, public_wallet, provenance_notes, consent_scope], [manifest, table, export])
    checkout_btn.click(ui_checkout, [checkout_email, checkout_artifact], [checkout_url])

app = gr.mount_gradio_app(api, demo, path="/")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "7860")))
