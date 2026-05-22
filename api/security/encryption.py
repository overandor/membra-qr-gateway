"""AES-GCM field-level encryption for sensitive database values.

Usage:
    from api.security.encryption import encrypt_field, decrypt_field

    ciphertext = encrypt_field("sensitive@example.com")
    plaintext  = decrypt_field(ciphertext)

The ciphertext format is:  base64(nonce || tag || ciphertext)
where nonce is 12 bytes (96-bit) as recommended for AES-GCM.
"""
from __future__ import annotations

import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from api.security.secrets import require_field_encryption_key


def _gcm() -> AESGCM:
    return AESGCM(require_field_encryption_key())


def encrypt_field(plaintext: str, associated_data: bytes | None = None) -> str:
    """Encrypt *plaintext* and return a base64-encoded ciphertext blob."""
    nonce = os.urandom(12)
    ct = _gcm().encrypt(nonce, plaintext.encode("utf-8"), associated_data)
    # Store nonce prepended to ciphertext (tag is appended by AESGCM)
    blob = nonce + ct
    return base64.b64encode(blob).decode("ascii")


def decrypt_field(ciphertext_b64: str, associated_data: bytes | None = None) -> str:
    """Decrypt a base64 blob produced by :func:`encrypt_field`."""
    blob = base64.b64decode(ciphertext_b64.encode("ascii"))
    nonce, ct = blob[:12], blob[12:]
    plaintext_bytes = _gcm().decrypt(nonce, ct, associated_data)
    return plaintext_bytes.decode("utf-8")
