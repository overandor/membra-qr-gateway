use anchor_lang::prelude::*;

/// Global IDO configuration account.
///
/// PDA seeds: `[b"ido_config", token_mint.key().as_ref()]`
#[account]
#[derive(Default)]
pub struct IdoConfig {
    /// Authority that can administer the IDO.
    pub authority: Pubkey,
    /// The token being sold in the IDO.
    pub token_mint: Pubkey,
    /// The payment token (e.g. USDC, 6 decimals).
    pub payment_mint: Pubkey,
    /// Token vault holding IDO tokens for sale.
    pub token_vault: Pubkey,
    /// Payment vault that receives USDC from buyers.
    pub payment_vault: Pubkey,
    /// Treasury address for receiving funds / unsold tokens.
    pub treasury: Pubkey,
    /// Governance program / multisig that can also administer the IDO.
    pub governance: Pubkey,
    /// Price per IDO token expressed in payment-mint units (6 decimals for USDC).
    pub token_price_usd_6: u64,
    /// Maximum number of IDO tokens available for sale.
    pub hard_cap_tokens: u64,
    /// Minimum token amount a single wallet may purchase.
    pub min_purchase_tokens: u64,
    /// Maximum token amount a single wallet may purchase.
    pub max_purchase_tokens: u64,
    /// Running total of tokens sold so far.
    pub total_sold_tokens: u64,
    /// Running total of payment tokens received.
    pub total_raised_payment: u64,
    /// Unix timestamp when the IDO opens.
    pub start_ts: i64,
    /// Unix timestamp when the IDO closes.
    pub end_ts: i64,
    /// Unix timestamp when token claims become available.
    pub claim_start_ts: i64,
    /// True once `finalize_ido` has been successfully called.
    pub finalized: bool,
    /// True if the IDO has been cancelled (enables refunds).
    pub cancelled: bool,
    /// True if purchases are temporarily paused.
    pub paused: bool,
    /// If true, unsold tokens are burned at finalization; otherwise sent to treasury.
    pub unsold_burn: bool,
    /// PDA bump seed.
    pub bump: u8,
}

impl IdoConfig {
    /// Discriminator (8) + all fields.
    pub const LEN: usize = 8
        + 32  // authority
        + 32  // token_mint
        + 32  // payment_mint
        + 32  // token_vault
        + 32  // payment_vault
        + 32  // treasury
        + 32  // governance
        + 8   // token_price_usd_6
        + 8   // hard_cap_tokens
        + 8   // min_purchase_tokens
        + 8   // max_purchase_tokens
        + 8   // total_sold_tokens
        + 8   // total_raised_payment
        + 8   // start_ts
        + 8   // end_ts
        + 8   // claim_start_ts
        + 1   // finalized
        + 1   // cancelled
        + 1   // paused
        + 1   // unsold_burn
        + 1;  // bump
}

/// Per-user participation record for a given IDO.
///
/// PDA seeds: `[b"user_ido", ido_config.key().as_ref(), user.key().as_ref()]`
#[account]
#[derive(Default)]
pub struct UserIdoRecord {
    /// The participating user's wallet.
    pub user: Pubkey,
    /// The IdoConfig this record belongs to.
    pub ido_config: Pubkey,
    /// Cumulative IDO tokens purchased by this user.
    pub tokens_purchased: u64,
    /// Cumulative payment deposited by this user.
    pub payment_deposited: u64,
    /// True once the user has claimed their IDO tokens.
    pub tokens_claimed: bool,
    /// True once the user has received a refund.
    pub refunded: bool,
    /// PDA bump seed.
    pub bump: u8,
}

impl UserIdoRecord {
    /// Discriminator (8) + all fields.
    pub const LEN: usize = 8
        + 32  // user
        + 32  // ido_config
        + 8   // tokens_purchased
        + 8   // payment_deposited
        + 1   // tokens_claimed
        + 1   // refunded
        + 1;  // bump
}
