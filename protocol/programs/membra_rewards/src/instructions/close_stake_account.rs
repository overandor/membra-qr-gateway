use anchor_lang::prelude::*;
use crate::{
    errors::RewardsError,
    state::{RewardsPool, UserStakeAccount},
};

#[derive(Accounts)]
pub struct CloseStakeAccount<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        seeds = [b"rewards_pool", rewards_pool.reward_mint.as_ref(), rewards_pool.stake_mint.as_ref()],
        bump = rewards_pool.bump,
    )]
    pub rewards_pool: Account<'info, RewardsPool>,

    #[account(
        mut,
        seeds = [b"user_stake", rewards_pool.key().as_ref(), user.key().as_ref()],
        bump = user_stake_account.bump,
        has_one = user @ RewardsError::Unauthorized,
        has_one = rewards_pool @ RewardsError::Unauthorized,
        close = user,
    )]
    pub user_stake_account: Account<'info, UserStakeAccount>,
}

/// Close a fully unstaked UserStakeAccount and recover rent.
/// Only callable when staked_amount == 0 and pending_rewards == 0.
pub fn handler(ctx: Context<CloseStakeAccount>) -> Result<()> {
    let stake = &ctx.accounts.user_stake_account;
    require!(stake.staked_amount == 0, RewardsError::InsufficientStake);
    require!(stake.pending_rewards == 0, RewardsError::NoRewardsToClaim);
    // Anchor closes the account via `close = user` constraint automatically
    Ok(())
}
