use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint};
use anchor_spl::associated_token::AssociatedToken;

use crate::state::{PromptAsset, LlmConfig, TokenConfig};
use crate::errors::LlmError;
use crate::events::PromptAssetCreated;

#[derive(Accounts)]
pub struct CreatePromptAsset<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        seeds = [b"llm_config"],
        bump = llm_config.bump,
        constraint = !llm_config.paused @ LlmError::ProgramPaused
    )]
    pub llm_config: Account<'info, LlmConfig>,

    #[account(
        seeds = [b"token_config"],
        bump = token_config.bump,
        constraint = token_config.token_mint == token_mint.key() @ LlmError::InvalidAuthority
    )]
    pub token_config: Account<'info, TokenConfig>,

    #[account(
        init,
        payer = owner,
        space = 8 + 32 + 32 + 8 + 256 + 8 + 8 + 1,
        seeds = [b"prompt_asset", owner.key().as_ref(), prompt_hash.as_ref()],
        bump
    )]
    pub prompt_asset: Account<'info, PromptAsset>,

    #[account(
        constraint = token_mint.key() == token_config.token_mint @ LlmError::InvalidAuthority
    )]
    pub token_mint: Account<'info, Mint>,
    
    #[account(
        init_if_needed,
        payer = owner,
        associated_token::mint = token_mint,
        associated_token::authority = owner,
    )]
    pub owner_token_account: Account<'info, TokenAccount>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<CreatePromptAsset>,
    prompt_hash: [u8; 32],
    token_cost: u64,
    metadata_uri: String,
) -> Result<()> {
    let prompt_asset = &mut ctx.accounts.prompt_asset;
    let clock = Clock::get()?;
    
    // Validate inputs
    require!(metadata_uri.len() <= 256, LlmError::InvalidMetadataUri);
    require!(token_cost > 0, LlmError::InvalidParameters);
    
    // Initialize prompt asset
    prompt_asset.owner = ctx.accounts.owner.key();
    prompt_asset.prompt_hash = prompt_hash;
    prompt_asset.token_cost = token_cost;
    prompt_asset.metadata_uri = metadata_uri;
    prompt_asset.usage_count = 0;
    prompt_asset.created_at = clock.unix_timestamp;
    prompt_asset.bump = ctx.bumps.prompt_asset;
    
    // Emit event
    emit!(PromptAssetCreated {
        prompt_asset: prompt_asset.key(),
        owner: ctx.accounts.owner.key(),
        prompt_hash,
        token_cost,
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}
