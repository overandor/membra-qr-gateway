use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::{
    errors::RewardsError,
    events::{EarlyExitPenalty, Unstaked},
    state::{RewardsPool, UserStakeAccount},
};

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct Unstake<'info> {
    /// User withdrawing staked tokens.
    #[account(mut)]
    pub user: Signer<'info>,

    /// The rewards pool.
    #[account(
        mut,
        seeds = [b"rewards_pool", rewards_pool.reward_mint.as_ref(), rewards_pool.stake_mint.as_ref()],
        bump = rewards_pool.bump,
    )]
    pub rewards_pool: Account<'info, RewardsPool>,

    /// Stake-mint reference.
    #[account(address = rewards_pool.stake_mint)]
    pub stake_mint: Account<'info, Mint>,

    /// Pool stake vault (source of withdrawal).
    #[account(
        mut,
        address = rewards_pool.stake_vault,
        token::mint = stake_mint,
    )]
    pub stake_vault: Account<'info, TokenAccount>,

    /// User's destination token account.
    #[account(
        mut,
        token::mint = stake_mint,
        token::authority = user,
    )]
    pub user_stake_ata: Account<'info, TokenAccount>,

    /// Penalty destination token account (must match pool.penalty_destination).
    /// Only used when an early-exit penalty is applied.
    ///
    /// CHECK: Ownership validated below via address constraint.
    #[account(
        mut,
        address = rewards_pool.penalty_destination,
    )]
    pub penalty_destination_ata: Account<'info, TokenAccount>,

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

pub fn handler(ctx: Context<Unstake>, amount: u64) -> Result<()> {
    require!(amount > 0, RewardsError::InvalidAmount);
    require!(
        ctx.accounts.user_stake_account.staked_amount >= amount,
        RewardsError::InsufficientStake
    );

    let now = Clock::get()?.unix_timestamp;

    // Step 1 – update pool accumulator.
    ctx.accounts.rewards_pool.update_pool(now)?;

    let accumulated = ctx.accounts.rewards_pool.accumulated_reward_per_share;
    let stake_account = &mut ctx.accounts.user_stake_account;

    // Step 2 – harvest pending rewards into buffer.
    let pending_u128 = stake_account.compute_pending(accumulated)?;
    let pending_u64 = u64::try_from(pending_u128).unwrap_or(u64::MAX);
    stake_account.pending_rewards = stake_account
        .pending_rewards
        .checked_add(pending_u64)
        .ok_or(RewardsError::ArithmeticOverflow)?;

    // Step 3 – determine penalty.
    let is_locked = stake_account.lock_end_ts > 0 && stake_account.lock_end_ts > now;

    let penalty_amount = if is_locked {
        let penalty = (amount as u128)
            .checked_mul(ctx.accounts.rewards_pool.early_exit_penalty_bps as u128)
            .ok_or(RewardsError::ArithmeticOverflow)?
            .checked_div(10_000)
            .unwrap_or(0);
        u64::try_from(penalty).unwrap_or(u64::MAX)
    } else {
        0u64
    };

    let user_receives = amount
        .checked_sub(penalty_amount)
        .ok_or(RewardsError::ArithmeticOverflow)?;

    // Step 4 – remove old weighted_shares from pool total.
    ctx.accounts.rewards_pool.total_weighted_shares = ctx
        .accounts
        .rewards_pool
        .total_weighted_shares
        .checked_sub(stake_account.weighted_shares)
        .ok_or(RewardsError::ArithmeticOverflow)?;

    // Step 5 – update stake account.
    stake_account.staked_amount = stake_account
        .staked_amount
        .checked_sub(amount)
        .ok_or(RewardsError::ArithmeticOverflow)?;

    if is_locked {
        stake_account.early_exit_used = true;
    }

    stake_account.recalculate_weighted_shares()?;

    // Step 6 – add new (reduced) weighted_shares back to pool total.
    ctx.accounts.rewards_pool.total_weighted_shares = ctx
        .accounts
        .rewards_pool
        .total_weighted_shares
        .checked_add(stake_account.weighted_shares)
        .ok_or(RewardsError::ArithmeticOverflow)?;

    // Snapshot updated reward debt.
    stake_account.sync_reward_debt(accumulated)?;

    // Build PDA signer seeds for vault withdrawals.
    let reward_mint_key = ctx.accounts.rewards_pool.reward_mint;
    let stake_mint_key = ctx.accounts.rewards_pool.stake_mint;
    let pool_bump = ctx.accounts.rewards_pool.bump;
    let seeds: &[&[&[u8]]] = &[&[
        b"rewards_pool",
        reward_mint_key.as_ref(),
        stake_mint_key.as_ref(),
        &[pool_bump],
    ]];

    // Step 7 – transfer penalty to penalty_destination.
    if penalty_amount > 0 {
        let penalty_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.stake_vault.to_account_info(),
                to: ctx.accounts.penalty_destination_ata.to_account_info(),
                authority: ctx.accounts.rewards_pool.to_account_info(),
            },
            seeds,
        );
        token::transfer(penalty_ctx, penalty_amount)?;

        emit!(EarlyExitPenalty {
            user: ctx.accounts.user.key(),
            penalty_amount,
            destination: ctx.accounts.rewards_pool.penalty_destination,
            ts: now,
        });
    }

    // Step 8 – transfer user_receives to user.
    if user_receives > 0 {
        let user_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.stake_vault.to_account_info(),
                to: ctx.accounts.user_stake_ata.to_account_info(),
                authority: ctx.accounts.rewards_pool.to_account_info(),
            },
            seeds,
        );
        token::transfer(user_ctx, user_receives)?;
    }

    emit!(Unstaked {
        user: ctx.accounts.user.key(),
        amount,
        penalty_paid: penalty_amount,
        ts: now,
    });

    Ok(())
}
