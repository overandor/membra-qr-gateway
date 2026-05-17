use anchor_lang::prelude::*;

#[error_code]
pub enum IdoError {
    /// The IDO has not started yet.
    #[msg("IDO has not started yet")]
    IdoNotStarted,

    /// The IDO has already ended.
    #[msg("IDO has already ended")]
    IdoEnded,

    /// The IDO has not ended yet.
    #[msg("IDO has not ended yet")]
    IdoNotEnded,

    /// The IDO is not active (cancelled or finalized).
    #[msg("IDO is not active")]
    IdoNotActive,

    /// The IDO has already been finalized.
    #[msg("IDO has already been finalized")]
    IdoAlreadyFinalized,

    /// The IDO has already been cancelled.
    #[msg("IDO has already been cancelled")]
    IdoAlreadyCancelled,

    /// The IDO is currently paused.
    #[msg("IDO is currently paused")]
    IdoPaused,

    /// Purchase would exceed the hard cap.
    #[msg("Purchase would exceed the hard cap")]
    HardCapExceeded,

    /// Purchase would exceed the per-wallet cap.
    #[msg("Purchase would exceed the per-wallet cap")]
    WalletCapExceeded,

    /// Purchase amount is below the minimum.
    #[msg("Purchase amount is below the minimum")]
    BelowMinimumPurchase,

    /// Purchase amount is above the maximum per wallet.
    #[msg("Purchase amount is above the maximum per wallet")]
    AboveMaximumPurchase,

    /// Invalid amount provided.
    #[msg("Invalid amount provided")]
    InvalidAmount,

    /// Invalid timestamp provided.
    #[msg("Invalid timestamp provided")]
    InvalidTimestamp,

    /// Invalid price provided.
    #[msg("Invalid price provided")]
    InvalidPrice,

    /// Tokens have already been claimed.
    #[msg("Tokens have already been claimed")]
    AlreadyClaimed,

    /// Payment has already been refunded.
    #[msg("Payment has already been refunded")]
    AlreadyRefunded,

    /// IDO has not been finalized yet.
    #[msg("IDO has not been finalized yet")]
    IdoNotFinalized,

    /// IDO has not been cancelled.
    #[msg("IDO has not been cancelled")]
    IdoNotCancelled,

    /// Caller is not authorized to perform this action.
    #[msg("Unauthorized")]
    Unauthorized,

    /// Provided mint does not match the expected mint.
    #[msg("Invalid mint")]
    InvalidMint,

    /// Provided vault does not match the expected vault.
    #[msg("Invalid vault")]
    InvalidVault,

    /// Token claim period has not started yet.
    #[msg("Token claim period has not started yet")]
    ClaimNotStarted,

    /// Arithmetic overflow detected.
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
}
