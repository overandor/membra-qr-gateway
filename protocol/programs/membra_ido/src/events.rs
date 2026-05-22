use anchor_lang::prelude::*;

#[event]
pub struct IdoInitialized {
    pub authority: Pubkey,
    pub token_mint: Pubkey,
    pub payment_mint: Pubkey,
    pub hard_cap_tokens: u64,
    pub token_price_usd_6: u64,
    pub start_ts: i64,
    pub end_ts: i64,
}

#[event]
pub struct IdoPurchased {
    pub user: Pubkey,
    pub tokens_purchased: u64,
    pub payment_deposited: u64,
    pub total_sold_tokens: u64,
}

#[event]
pub struct IdoFinalized {
    pub total_sold_tokens: u64,
    pub total_raised_payment: u64,
    pub ts: i64,
}

#[event]
pub struct IdoRefunded {
    pub user: Pubkey,
    pub payment_refunded: u64,
    pub ts: i64,
}

#[event]
pub struct IdoTokensClaimed {
    pub user: Pubkey,
    pub tokens_claimed: u64,
    pub ts: i64,
}

#[event]
pub struct IdoPaused {
    pub authority: Pubkey,
    pub ts: i64,
}

#[event]
pub struct IdoResumed {
    pub authority: Pubkey,
    pub ts: i64,
}

#[event]
pub struct IdoCancelled {
    pub authority: Pubkey,
    pub total_sold_tokens: u64,
    pub total_raised_payment: u64,
    pub ts: i64,
}
