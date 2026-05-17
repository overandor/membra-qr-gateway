use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::{
    errors::RewardsError,
    events::{EarlyExitPenalty, LockClosed},
    state::{LockRecord, RewardsPool},
};

#[derive(Accounts)]
pub struct CloseLock<'info> {
    /// User closing the lock.
    #[account(mut)]
    pub user: Signer<'info>,

    /// The rewards pool this lock belongs to.
    #[account(
        mut,
        seeds = [b"rewards_pool", rewards_pool.reward_mint.as_ref(), rewards_pool.stake_mint.as_ref()],
        bump = rewards_pool.bump,
    )]
    pub rewards_pool: Account<'info, RewardsPool>,

    /// Stake-mint reference.
    #[account(address = rewards_pool.stake_mint)]
    pub stake_mint: Account<'info, Mint>,

    /// Pool stake vault (source of refund tokens).
    #[account(
        mut,
        address = rewards_pool.stake_vault,
        token::mint = stake_mint,
    )]
    pub stake_vault: Account<'info, TokenAccount>,

    /// User's stake token destination.
    #[account(
        mut,
        token::mint = stake_mint,
        token::authority = user,
    )]
    pub user_stake_ata: Account<'info, TokenAccount>,

    /// Penalty destination token account.
    #[account(
        mut,
        address = rewards_pool.penalty_destination,
    )]
    pub penalty_destination_ata: Account<'info, TokenAccount>,

    /// LockRecord PDA being closed.
    #[account(
        mut,
        constraint = lock_record.user == user.key() @ RewardsError::Unauthorized,
        constraint = lock_record.rewards_pool == rewards_pool.key() @ RewardsError::Unauthorized,
        constraint = !lock_record.closed @ RewardsError::LockAlreadyClosed,
    )]
    pub lock_record: Account<'info, LockRecord>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<CloseLock>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let lock_record = &mut ctx.accounts.lock_record;

    // Determine whether the lock has expired.
    // lock_end_ts == 0 means flexible (no lock), always closeable.
    let is_locked = lock_record.lock_end_ts > 0 && lock_record.lock_end_ts > now;

    // Build PDA signer seeds.
    let reward_mint_key = ctx.accounts.rewards_pool.reward_mint;
    let stake_mint_key = ctx.accounts.rewards_pool.stake_mint;
    let pool_bump = ctx.accounts.rewards_pool.bump;
    let seeds: &[&[&[u8]]] = &[&[
        b"rewards_pool",
        reward_mint_key.as_ref(),
        stake_mint_key.as_ref(),
        &[pool_bump],
    ]];

    let locked_amount = lock_record.locked_amount;

    // Compute penalty and net user amount in one place.
    let (penalty_amount, user_receives) = if is_locked {
        let penalty_u128 = (locked_amount as u128)
            .checked_mul(ctx.accounts.rewards_pool.early_exit_penalty_bps as u128)
            .ok_or(RewardsError::ArithmeticOverflow)?
            .checked_div(10_000)
            .unwrap_or(0);
        let penalty = u64::try_from(penalty_u128).unwrap_or(u64::MAX);
        let net = locked_amount
            .checked_sub(penalty)
            .ok_or(RewardsError::ArithmeticOverflow)?;
        (penalty, net)
    } else {
        (0u64, locked_amount)
    };

    if is_locked {
        lock_record.penalty_paid = lock_record
            .penalty_paid
            .checked_add(penalty_amount)
            .ok_or(RewardsError::ArithmeticOverflow)?;

        // Transfer penalty.
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
    }

    // Transfer unlocked tokens (after penalty) to user.
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

    // Mark the record as closed.
    lock_record.closed = true;

    emit!(LockClosed {
        user: ctx.accounts.user.key(),
        locked_amount,
        ts: now,
    });

    Ok(())
}
