use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::{
    errors::RewardsError,
    events::RewardsPoolInitialized,
    state::RewardsPool,
};

#[derive(Accounts)]
pub struct InitializeRewards<'info> {
    /// Payer and initial authority of the rewards pool.
    #[account(mut)]
    pub authority: Signer<'info>,

    /// Governance / multisig that can co-administer.
    /// CHECK: Validated by pubkey storage only.
    pub governance: UncheckedAccount<'info>,

    /// Mint of the token distributed as protocol rewards.
    pub reward_mint: Account<'info, Mint>,

    /// Mint of the token that users stake.
    pub stake_mint: Account<'info, Mint>,

    /// Pre-created token account that will hold reward tokens.
    /// Must be owned by the rewards_pool PDA.
    #[account(
        mut,
        token::mint = reward_mint,
        token::authority = rewards_pool,
    )]
    pub reward_vault: Account<'info, TokenAccount>,

    /// Pre-created token account that will hold staked tokens.
    /// Must be owned by the rewards_pool PDA.
    #[account(
        mut,
        token::mint = stake_mint,
        token::authority = rewards_pool,
    )]
    pub stake_vault: Account<'info, TokenAccount>,

    /// Destination for early-exit penalty tokens (treasury or another account).
    /// CHECK: Validated by pubkey storage only.
    pub penalty_destination: UncheckedAccount<'info>,

    /// Global rewards pool PDA.
    #[account(
        init,
        payer = authority,
        space = RewardsPool::LEN,
        seeds = [b"rewards_pool", reward_mint.key().as_ref(), stake_mint.key().as_ref()],
        bump,
    )]
    pub rewards_pool: Account<'info, RewardsPool>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<InitializeRewards>,
    emission_rate_per_second: u64,
    reward_pool_cap: u64,
    early_exit_penalty_bps: u64,
) -> Result<()> {
    require!(emission_rate_per_second > 0, RewardsError::InvalidEmissionRate);
    require!(reward_pool_cap > 0, RewardsError::InvalidAmount);
    require!(
        ctx.accounts.governance.key() != Pubkey::default(),
        RewardsError::Unauthorized
    );
    require!(
        ctx.accounts.penalty_destination.key() != Pubkey::default(),
        RewardsError::InvalidPenaltyDestination
    );

    let now = Clock::get()?.unix_timestamp;
    let pool = &mut ctx.accounts.rewards_pool;
    let bump = ctx.bumps.rewards_pool;

    pool.authority = ctx.accounts.authority.key();
    pool.governance = ctx.accounts.governance.key();
    pool.reward_mint = ctx.accounts.reward_mint.key();
    pool.stake_mint = ctx.accounts.stake_mint.key();
    pool.reward_vault = ctx.accounts.reward_vault.key();
    pool.stake_vault = ctx.accounts.stake_vault.key();

    pool.total_weighted_shares = 0;
    pool.accumulated_reward_per_share = 0;
    pool.last_reward_ts = now;

    pool.emission_rate_per_second = emission_rate_per_second;
    pool.reward_pool_cap = reward_pool_cap;

    pool.paused = false;
    pool.early_exit_penalty_bps = early_exit_penalty_bps;
    pool.penalty_destination = ctx.accounts.penalty_destination.key();

    pool.lock_count = 0;
    pool.bump = bump;

    emit!(RewardsPoolInitialized {
        authority: pool.authority,
        reward_mint: pool.reward_mint,
        stake_mint: pool.stake_mint,
        emission_rate_per_second: pool.emission_rate_per_second,
    });

    Ok(())
}
