use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Burn, Mint};
use anchor_spl::token::burn;

use crate::state::{PromptAsset, InferenceRequest, LlmConfig, TokenConfig, InferenceStatus};
use crate::errors::LlmError;
use crate::events::InferenceRequestSubmitted;

#[derive(Accounts)]
pub struct SubmitInferenceRequest<'info> {
    #[account(mut)]
    pub submitter: Signer<'info>,
    
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
        constraint = prompt_asset.owner == submitter.key() || prompt_asset.usage_count < 1000 @ LlmError::Unauthorized
    )]
    pub prompt_asset: Account<'info, PromptAsset>,
    
    #[account(
        init,
        payer = submitter,
        space = 8 + 32 + 32 + 64 + 256 + 1 + 9 + 8 + 8 + 9 + 1,
        seeds = [b"inference_request", prompt_asset.key().as_ref(), submitter.key().as_ref(), &Clock::get().unwrap().unix_timestamp.to_le_bytes()],
        bump
    )]
    pub inference_request: Account<'info, InferenceRequest>,
    
    #[account(
        mut,
        constraint = token_mint.key() == token_config.token_mint @ LlmError::InvalidAuthority
    )]
    pub token_mint: Account<'info, Mint>,
    
    #[account(
        mut,
        constraint = submitter_token_account.mint == token_mint.key() @ LlmError::InvalidAuthority,
        constraint = submitter_token_account.owner == submitter.key() @ LlmError::Unauthorized
    )]
    pub submitter_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = token_vault.mint == token_mint.key() @ LlmError::InvalidAuthority
    )]
    pub token_vault: Account<'info, TokenAccount>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    
    pub clock: Sysvar<'info, Clock>,
}

pub fn handler(
    ctx: Context<SubmitInferenceRequest>,
    prompt_asset: Pubkey,
    model_id: String,
    parameters: Vec<u8>,
) -> Result<()> {
    let inference_request = &mut ctx.accounts.inference_request;
    let prompt_asset_acc = &ctx.accounts.prompt_asset;
    let clock = Clock::get()?;
    
    // Validate model ID
    let supported_models: Vec<&str> = ctx.accounts.llm_config.supported_models.split(',').collect();
    require!(
        supported_models.contains(&model_id.as_str()),
        LlmError::ModelNotSupported
    );
    
    // Validate parameters size
    require!(parameters.len() <= 256, LlmError::InvalidParameters);
    
    // Check token balance
    let required_tokens = prompt_asset_acc.token_cost;
    require!(
        ctx.accounts.submitter_token_account.amount >= required_tokens,
        LlmError::InsufficientTokenBalance
    );
    
    // Burn tokens from submitter
    let cpi_accounts = Burn {
        mint: ctx.accounts.token_mint.to_account_info(),
        from: ctx.accounts.submitter_token_account.to_account_info(),
        authority: ctx.accounts.submitter.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    burn(cpi_ctx, required_tokens)?;
    
    // Initialize inference request
    inference_request.prompt_asset = prompt_asset;
    inference_request.submitter = ctx.accounts.submitter.key();
    inference_request.model_id = model_id;
    inference_request.parameters = parameters;
    inference_request.status = InferenceStatus::Pending;
    inference_request.response = None;
    inference_request.submitted_at = clock.unix_timestamp;
    inference_request.completed_at = None;
    inference_request.bump = ctx.bumps.inference_request;
    
    // Update prompt usage count
    let prompt_asset_mut = &mut ctx.accounts.prompt_asset;
    prompt_asset_mut.usage_count += 1;
    
    // Emit event
    emit!(InferenceRequestSubmitted {
        inference_request: inference_request.key(),
        prompt_asset,
        submitter: ctx.accounts.submitter.key(),
        model_id: inference_request.model_id.clone(),
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}
