use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::{
    errors::RewardsError,
    events::Staked,
    state::{RewardsPool, UserStakeAccount},
};

#[derive(Accounts)]
#[instruction(amount: u64, lock_duration_seconds: i64)]
pub struct Stake<'info> {
    /// User staking tokens.
    #[account(mut)]
    pub user: Signer<'info>,

    /// The target rewards pool.
    #[account(
        mut,
        seeds = [b"rewards_pool", rewards_pool.reward_mint.as_ref(), rewards_pool.stake_mint.as_ref()],
        bump = rewards_pool.bump,
    )]
    pub rewards_pool: Account<'info, RewardsPool>,

    /// Stake-mint reference.
    #[account(address = rewards_pool.stake_mint)]
    pub stake_mint: Account<'info, Mint>,

    /// User's source token account.
    #[account(
        mut,
        token::mint = stake_mint,
        token::authority = user,
    )]
    pub user_stake_ata: Account<'info, TokenAccount>,

    /// Pool stake vault.
    #[account(
        mut,
        address = rewards_pool.stake_vault,
        token::mint = stake_mint,
    )]
    pub stake_vault: Account<'info, TokenAccount>,

    /// User stake account PDA – created on first stake, updated on subsequent ones.
    #[account(
        init_if_needed,
        payer = user,
        space = UserStakeAccount::LEN,
        seeds = [b"user_stake", rewards_pool.key().as_ref(), user.key().as_ref()],
        bump,
    )]
    pub user_stake_account: Account<'info, UserStakeAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<Stake>,
    amount: u64,
    lock_duration_seconds: i64,
) -> Result<()> {
    require!(amount > 0, RewardsError::InvalidAmount);
    require!(!ctx.accounts.rewards_pool.paused, RewardsError::RewardsPaused);

    // Validate duration and resolve multiplier.
    let reward_multiplier_bps = RewardsPool::multiplier_for_duration(lock_duration_seconds)
        .ok_or(RewardsError::InvalidLockDuration)?;

    let now = Clock::get()?.unix_timestamp;

    // Step 1 – update pool accumulator.
    ctx.accounts.rewards_pool.update_pool(now)?;

    let accumulated = ctx.accounts.rewards_pool.accumulated_reward_per_share;
    let stake_account = &mut ctx.accounts.user_stake_account;

    // Step 2 – harvest any pending rewards into pending_rewards buffer before
    //           changing weighted_shares, so the user doesn't lose earned rewards.
    if stake_account.staked_amount > 0 {
        let pending_u128 = stake_account.compute_pending(accumulated)?;
        let pending_u64 = u64::try_from(pending_u128).unwrap_or(u64::MAX);
        stake_account.pending_rewards = stake_account
            .pending_rewards
            .checked_add(pending_u64)
            .ok_or(RewardsError::ArithmeticOverflow)?;
    }

    // Step 3 – transfer stake tokens from user to vault.
    let transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.user_stake_ata.to_account_info(),
            to: ctx.accounts.stake_vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        },
    );
    token::transfer(transfer_ctx, amount)?;

    // Step 4 – update stake account fields.
    let is_new_account = stake_account.staked_amount == 0
        && stake_account.lock_start_ts == 0
        && stake_account.user == Pubkey::default();

    if is_new_account {
        stake_account.user = ctx.accounts.user.key();
        stake_account.rewards_pool = ctx.accounts.rewards_pool.key();
        stake_account.bump = ctx.bumps.user_stake_account;
    }

    // Remove old weighted_shares from pool total.
    ctx.accounts.rewards_pool.total_weighted_shares = ctx
        .accounts
        .rewards_pool
        .total_weighted_shares
        .checked_sub(stake_account.weighted_shares)
        .ok_or(RewardsError::ArithmeticOverflow)?;

    // Update stake amount and lock parameters.
    stake_account.staked_amount = stake_account
        .staked_amount
        .checked_add(amount)
        .ok_or(RewardsError::ArithmeticOverflow)?;

    // Lock parameters: respect existing lock if one is still active, else apply new.
    let lock_end_ts = if lock_duration_seconds == 0 {
        0i64
    } else {
        now.checked_add(lock_duration_seconds)
            .ok_or(RewardsError::ArithmeticOverflow)?
    };

    stake_account.lock_duration_seconds = lock_duration_seconds;
    stake_account.lock_start_ts = now;
    stake_account.lock_end_ts = lock_end_ts;
    stake_account.reward_multiplier_bps = reward_multiplier_bps;
    stake_account.early_exit_used = false;

    // Recompute weighted_shares.
    stake_account.recalculate_weighted_shares()?;

    // Add new weighted_shares to pool total.
    ctx.accounts.rewards_pool.total_weighted_shares = ctx
        .accounts
        .rewards_pool
        .total_weighted_shares
        .checked_add(stake_account.weighted_shares)
        .ok_or(RewardsError::ArithmeticOverflow)?;

    // Snapshot reward debt.
    stake_account.sync_reward_debt(accumulated)?;

    emit!(Staked {
        user: ctx.accounts.user.key(),
        amount,
        lock_duration_seconds,
        reward_multiplier_bps,
        lock_end_ts,
    });

    Ok(())
}
