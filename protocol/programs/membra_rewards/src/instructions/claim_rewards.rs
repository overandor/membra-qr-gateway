use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::{
    errors::RewardsError,
    events::RewardsClaimed,
    state::{RewardsPool, UserStakeAccount},
};

#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    /// User claiming rewards.
    #[account(mut)]
    pub user: Signer<'info>,

    /// The rewards pool.
    #[account(
        mut,
        seeds = [b"rewards_pool", rewards_pool.reward_mint.as_ref(), rewards_pool.stake_mint.as_ref()],
        bump = rewards_pool.bump,
    )]
    pub rewards_pool: Account<'info, RewardsPool>,

    /// Reward-mint reference.
    #[account(address = rewards_pool.reward_mint)]
    pub reward_mint: Account<'info, Mint>,

    /// Pool reward vault (source of reward tokens).
    #[account(
        mut,
        address = rewards_pool.reward_vault,
        token::mint = reward_mint,
    )]
    pub reward_vault: Account<'info, TokenAccount>,

    /// User's reward token destination account.
    #[account(
        mut,
        token::mint = reward_mint,
        token::authority = user,
    )]
    pub user_reward_ata: Account<'info, TokenAccount>,

    /// User stake account PDA.
    #[account(
        mut,
        seeds = [b"user_stake", rewards_pool.key().as_ref(), user.key().as_ref()],
        bump = user_stake_account.bump,
        constraint = user_stake_account.user == user.key() @ RewardsError::Unauthorized,
        constraint = user_stake_account.rewards_pool == rewards_pool.key() @ RewardsError::Unauthorized,
    )]
    pub user_stake_account: Account<'info, UserStakeAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<ClaimRewards>) -> Result<()> {
    require!(!ctx.accounts.rewards_pool.paused, RewardsError::RewardsPaused);

    let now = Clock::get()?.unix_timestamp;

    // Step 1 – update pool accumulator.
    ctx.accounts.rewards_pool.update_pool(now)?;

    let accumulated = ctx.accounts.rewards_pool.accumulated_reward_per_share;
    let stake_account = &mut ctx.accounts.user_stake_account;

    // Step 2 – calculate claimable amount (new + buffered pending).
    let newly_accrued_u128 = stake_account.compute_pending(accumulated)?;
    let newly_accrued = u64::try_from(newly_accrued_u128).unwrap_or(u64::MAX);

    let total_claimable = stake_account
        .pending_rewards
        .checked_add(newly_accrued)
        .ok_or(RewardsError::ArithmeticOverflow)?;

    require!(total_claimable > 0, RewardsError::NoRewardsToClaim);

    // Step 3 – cap at available vault balance (never error, just reduce).
    let vault_balance = ctx.accounts.reward_vault.amount;
    let claimable = total_claimable.min(vault_balance);

    require!(claimable > 0, RewardsError::RewardPoolExhausted);

    // Step 4 – clear pending buffer and sync reward_debt.
    stake_account.pending_rewards = total_claimable.saturating_sub(claimable);
    stake_account.sync_reward_debt(accumulated)?;

    // Step 5 – transfer reward tokens from vault to user.
    let reward_mint_key = ctx.accounts.rewards_pool.reward_mint;
    let stake_mint_key = ctx.accounts.rewards_pool.stake_mint;
    let pool_bump = ctx.accounts.rewards_pool.bump;
    let seeds: &[&[&[u8]]] = &[&[
        b"rewards_pool",
        reward_mint_key.as_ref(),
        stake_mint_key.as_ref(),
        &[pool_bump],
    ]];

    let transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.reward_vault.to_account_info(),
            to: ctx.accounts.user_reward_ata.to_account_info(),
            authority: ctx.accounts.rewards_pool.to_account_info(),
        },
        seeds,
    );
    token::transfer(transfer_ctx, claimable)?;

    emit!(RewardsClaimed {
        user: ctx.accounts.user.key(),
        reward_amount: claimable,
        ts: now,
    });

    Ok(())
}
