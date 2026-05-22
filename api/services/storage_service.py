"""File storage abstraction — local disk implementation.

All file operations go through this module so the storage back-end can be
swapped (e.g. S3, GCS) without touching callers.
"""
from __future__ import annotations

import hashlib
import shutil
from pathlib import Path
from typing import BinaryIO

import structlog

from api.core.config import settings

log = structlog.get_logger(__name__)

# Default storage root — can be overridden via env or Settings
_STORAGE_ROOT = Path("/tmp/membra_storage")


def _root() -> Path:
    root = _STORAGE_ROOT
    root.mkdir(parents=True, exist_ok=True)
    return root


def artifact_path(artifact_id: str, filename: str) -> Path:
    """Return the full path for an artifact file without creating it."""
    safe_id = artifact_id.replace("/", "_").replace("..", "")
    bucket = _root() / safe_id
    bucket.mkdir(parents=True, exist_ok=True)
    return bucket / filename


def store_file(artifact_id: str, filename: str, data: bytes) -> str:
    """Write *data* to storage and return the relative path."""
    path = artifact_path(artifact_id, filename)
    path.write_bytes(data)
    digest = hashlib.sha256(data).hexdigest()
    log.info("file_stored", artifact_id=artifact_id, filename=filename, sha256=digest[:16])
    return str(path.relative_to(_root()))


def read_file(artifact_id: str, filename: str) -> bytes:
    """Return the raw bytes of a stored file."""
    path = artifact_path(artifact_id, filename)
    if not path.exists():
        from api.core.errors import NotFoundError
        raise NotFoundError(f"File not found: {artifact_id}/{filename}")
    return path.read_bytes()


def delete_file(artifact_id: str, filename: str) -> None:
    """Delete a file from storage (no-op if absent)."""
    path = artifact_path(artifact_id, filename)
    if path.exists():
        path.unlink()
        log.info("file_deleted", artifact_id=artifact_id, filename=filename)


def list_files(artifact_id: str) -> list[str]:
    """List all filenames stored for an artifact."""
    safe_id = artifact_id.replace("/", "_").replace("..", "")
    bucket = _root() / safe_id
    if not bucket.exists():
        return []
    return [p.name for p in sorted(bucket.iterdir()) if p.is_file()]
