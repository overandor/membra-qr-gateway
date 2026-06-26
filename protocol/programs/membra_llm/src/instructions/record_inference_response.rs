use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint, MintTo};
use anchor_spl::token::mint_to;

use crate::state::{InferenceRequest, InferenceResponse, MerkleTree, LlmConfig, TokenConfig, InferenceStatus};
use crate::errors::LlmError;
use crate::events::InferenceResponseRecorded;

#[derive(Accounts)]
pub struct RecordInferenceResponse<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        seeds = [b"llm_config"],
        bump = llm_config.bump,
        constraint = llm_config.authority == authority.key() @ LlmError::Unauthorized,
        constraint = !llm_config.paused @ LlmError::ProgramPaused
    )]
    pub llm_config: Account<'info, LlmConfig>,
    
    #[account(
        seeds = [b"token_config"],
        bump = token_config.bump
    )]
    pub token_config: Account<'info, TokenConfig>,
    
    #[account(
        mut,
        constraint = inference_request.status == InferenceStatus::Pending || inference_request.status == InferenceStatus::Processing @ LlmError::InvalidStatusTransition,
        constraint = inference_request.response.is_none() @ LlmError::InferenceRequestAlreadyCompleted
    )]
    pub inference_request: Account<'info, InferenceRequest>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 32 + 8 + 1 + 9 + 8 + 1,
        seeds = [b"inference_response", inference_request.key().as_ref()],
        bump
    )]
    pub inference_response: Account<'info, InferenceResponse>,
    
    #[account(
        mut,
        seeds = [b"merkle_tree", inference_request.key().as_ref()],
        bump = merkle_tree.bump
    )]
    pub merkle_tree: Account<'info, MerkleTree>,
    
    #[account(
        mut,
        constraint = token_mint.key() == token_config.token_mint @ LlmError::InvalidAuthority
    )]
    pub token_mint: Account<'info, Mint>,
    
    #[account(
        mut,
        constraint = authority_token_account.mint == token_mint.key() @ LlmError::InvalidAuthority,
        constraint = authority_token_account.owner == authority.key() @ LlmError::Unauthorized
    )]
    pub authority_token_account: Account<'info, TokenAccount>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub clock: Sysvar<'info, Clock>,
}

pub fn handler(
    ctx: Context<RecordInferenceResponse>,
    inference_request: Pubkey,
    response_hash: [u8; 32],
    merkle_root: [u8; 32],
    token_count: u64,
) -> Result<()> {
    let inference_response = &mut ctx.accounts.inference_response;
    let inference_request_acc = &mut ctx.accounts.inference_request;
    let merkle_tree = &mut ctx.accounts.merkle_tree;
    let clock = Clock::get()?;
    
    // Validate inputs
    require!(token_count > 0, LlmError::InvalidParameters);
    
    // Update inference request
    inference_request_acc.status = InferenceStatus::Completed;
    inference_request_acc.response = Some(inference_response.key());
    inference_request_acc.completed_at = Some(clock.unix_timestamp);
    
    // Initialize inference response
    inference_response.inference_request = inference_request;
    inference_response.response_hash = response_hash;
    inference_response.merkle_root = merkle_root;
    inference_response.token_count = token_count;
    inference_response.verified = false;
    inference_response.verified_at = None;
    inference_response.recorded_at = clock.unix_timestamp;
    inference_response.bump = ctx.bumps.inference_response;
    
    // Update merkle tree
    merkle_tree.root = merkle_root;
    merkle_tree.leaf_count += 1;
    merkle_tree.last_updated = clock.unix_timestamp;
    
    // Mint reward tokens to authority (for providing inference service)
    let reward_amount = token_count * 10; // 10x token multiplier for reward
    let cpi_accounts = MintTo {
        mint: ctx.accounts.token_mint.to_account_info(),
        to: ctx.accounts.authority_token_account.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    mint_to(cpi_ctx, reward_amount)?;
    
    // Emit event
    emit!(InferenceResponseRecorded {
        inference_response: inference_response.key(),
        inference_request,
        response_hash,
        merkle_root,
        token_count,
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}
