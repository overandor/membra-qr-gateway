use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::{
    errors::RewardsError,
    events::LockCreated,
    state::{LockRecord, RewardsPool},
};

#[derive(Accounts)]
#[instruction(amount: u64, lock_duration_seconds: i64)]
pub struct CreateLock<'info> {
    /// User creating the lock.
    #[account(mut)]
    pub user: Signer<'info>,

    /// The rewards pool this lock belongs to.
    #[account(
        mut,
        seeds = [b"rewards_pool", rewards_pool.reward_mint.as_ref(), rewards_pool.stake_mint.as_ref()],
        bump = rewards_pool.bump,
    )]
    pub rewards_pool: Account<'info, RewardsPool>,

    /// Stake-mint reference (needed for ATA validation).
    #[account(address = rewards_pool.stake_mint)]
    pub stake_mint: Account<'info, Mint>,

    /// User's token account to transfer stake from.
    #[account(
        mut,
        token::mint = stake_mint,
        token::authority = user,
    )]
    pub user_stake_ata: Account<'info, TokenAccount>,

    /// Pool vault that will hold the staked tokens.
    #[account(
        mut,
        address = rewards_pool.stake_vault,
        token::mint = stake_mint,
    )]
    pub stake_vault: Account<'info, TokenAccount>,

    /// LockRecord PDA – index is the current lock_count before increment.
    #[account(
        init,
        payer = user,
        space = LockRecord::LEN,
        seeds = [
            b"lock_record",
            rewards_pool.key().as_ref(),
            user.key().as_ref(),
            &rewards_pool.lock_count.to_le_bytes(),
        ],
        bump,
    )]
    pub lock_record: Account<'info, LockRecord>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<CreateLock>,
    amount: u64,
    lock_duration_seconds: i64,
) -> Result<()> {
    require!(amount > 0, RewardsError::InvalidAmount);
    require!(!ctx.accounts.rewards_pool.paused, RewardsError::RewardsPaused);

    // Validate duration and resolve multiplier.
    let reward_multiplier_bps = RewardsPool::multiplier_for_duration(lock_duration_seconds)
        .ok_or(RewardsError::InvalidLockDuration)?;

    let now = Clock::get()?.unix_timestamp;

    // Update the pool accumulator before modifying any shares.
    ctx.accounts.rewards_pool.update_pool(now)?;

    // Transfer tokens from the user to the stake vault.
    let transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.user_stake_ata.to_account_info(),
            to: ctx.accounts.stake_vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        },
    );
    token::transfer(transfer_ctx, amount)?;

    let lock_end_ts = if lock_duration_seconds == 0 {
        0i64 // flexible: no expiry
    } else {
        now.checked_add(lock_duration_seconds)
            .ok_or(RewardsError::ArithmeticOverflow)?
    };

    // Populate the LockRecord.
    let record = &mut ctx.accounts.lock_record;
    record.user = ctx.accounts.user.key();
    record.rewards_pool = ctx.accounts.rewards_pool.key();
    record.lock_duration_seconds = lock_duration_seconds;
    record.lock_start_ts = now;
    record.lock_end_ts = lock_end_ts;
    record.locked_amount = amount;
    record.reward_multiplier_bps = reward_multiplier_bps;
    record.penalty_paid = 0;
    record.closed = false;
    record.bump = ctx.bumps.lock_record;

    // Increment pool lock counter.
    ctx.accounts.rewards_pool.lock_count = ctx
        .accounts
        .rewards_pool
        .lock_count
        .checked_add(1)
        .ok_or(RewardsError::ArithmeticOverflow)?;

    emit!(LockCreated {
        user: ctx.accounts.user.key(),
        locked_amount: amount,
        lock_duration_seconds,
        lock_end_ts,
        reward_multiplier_bps,
    });

    Ok(())
}
