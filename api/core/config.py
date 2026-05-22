"""Application settings — all values sourced from environment variables.

Never hard-code secrets here.  Provide a .env file for local development
(add .env to .gitignore) and proper secret injection in production.
"""
from __future__ import annotations

from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # ── Application ──────────────────────────────────────────────────────────
    APP_NAME: str = "MEMBRA QR Gateway"
    APP_VERSION: str = "2.0.0"
    APP_BASE_URL: str = "http://localhost:7860"
    PORT: int = Field(default=7860, ge=1, le=65535)
    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"

    # ── Database ─────────────────────────────────────────────────────────────
    DB_PATH: Path = Path("/tmp/membra_qr_gateway.sqlite3")

    # ── Auth ─────────────────────────────────────────────────────────────────
    JWT_SECRET: str = Field(default="", description="HS256 signing secret — must be set in production")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = Field(default=60, ge=1)
    API_KEY_SALT: str = Field(default="", description="Salt for bcrypt API key hashing")
    ADMIN_API_KEY: str = Field(default="", description="Admin API key — empty disables admin endpoints")

    # ── MEMBRA events ────────────────────────────────────────────────────────
    MEMBRA_EVENT_SECRET: str = ""
    PUBLIC_SUPPORT_WALLET: str = ""

    # ── Stripe ───────────────────────────────────────────────────────────────
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRICE_ID: str = ""

    # ── Solana ───────────────────────────────────────────────────────────────
    SOLANA_RPC_URL: str = "https://api.mainnet-beta.solana.com"
    SOLANA_RPC_TIMEOUT_S: float = 10.0

    # ── CORS ─────────────────────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = Field(default_factory=list)

    # ── Rate limiting ─────────────────────────────────────────────────────────
    RATE_LIMIT_DEFAULT: int = Field(default=100, ge=1, description="Max requests per minute (default)")
    RATE_LIMIT_AUTH: int = Field(default=20, ge=1, description="Max requests per minute (auth routes)")

    # ── Encryption ───────────────────────────────────────────────────────────
    FIELD_ENCRYPTION_KEY: str = Field(
        default="",
        description="32-byte hex key for AES-GCM field encryption — generate with: openssl rand -hex 32",
    )

    # ── Notifications ────────────────────────────────────────────────────────
    WEBHOOK_NOTIFICATION_URL: str = ""
    WEBHOOK_SIGNING_SECRET: str = ""

    @field_validator("APP_BASE_URL")
    @classmethod
    def strip_trailing_slash(cls, v: str) -> str:
        return v.rstrip("/")

    @property
    def stripe_configured(self) -> bool:
        return bool(self.STRIPE_SECRET_KEY and self.STRIPE_WEBHOOK_SECRET and self.STRIPE_PRICE_ID)

    @property
    def jwt_configured(self) -> bool:
        return bool(self.JWT_SECRET)

    @property
    def membra_event_secret_configured(self) -> bool:
        return bool(self.MEMBRA_EVENT_SECRET)


# Module-level singleton — import this everywhere
settings = Settings()
