"""Receipt routes.

POST /api/receipts               — create a scan receipt
GET  /api/receipts/{id}          — get a receipt by ID
GET  /api/receipts/artifact/{id} — list receipts for an artifact
POST /api/receipts/{id}/verify   — mark a receipt as verified
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from api.db.session import get_db
from api.services.receipt_service import (
    ReceiptIn,
    create_receipt,
    get_receipt,
    list_receipts,
    verify_receipt,
)

router = APIRouter()


def _ok(data: object) -> dict:
    return {"ok": True, "data": data}


@router.post("/receipts", summary="Create a scan receipt")
async def post_receipt(data: ReceiptIn, request: Request, db=Depends(get_db)) -> dict:
    # Hash client IP on the way in — we never store raw IPs
    client_ip = ""
    if request.client:
        client_ip = request.client.host
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()

    data_with_ip = ReceiptIn(
        artifact_id=data.artifact_id,
        scan_ip=client_ip,
        user_agent=request.headers.get("User-Agent", ""),
        proof_hash=data.proof_hash,
    )
    receipt = await create_receipt(db, data_with_ip)
    return _ok(receipt)


@router.get("/receipts/{receipt_id}", summary="Get a receipt by ID")
async def get_receipt_route(receipt_id: str, db=Depends(get_db)) -> dict:
    receipt = await get_receipt(db, receipt_id)
    return _ok(receipt)


@router.get("/receipts/artifact/{artifact_id}", summary="List receipts for an artifact")
async def list_artifact_receipts(artifact_id: str, limit: int = 100, db=Depends(get_db)) -> dict:
    rows = await list_receipts(db, artifact_id, min(limit, 500))
    return _ok({"receipts": rows, "count": len(rows)})


@router.post("/receipts/{receipt_id}/verify", summary="Mark a receipt as verified")
async def verify_receipt_route(receipt_id: str, db=Depends(get_db)) -> dict:
    receipt = await verify_receipt(db, receipt_id)
    return _ok(receipt)
