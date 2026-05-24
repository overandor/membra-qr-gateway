use anchor_lang::prelude::*;

use crate::state::{PromptAsset, LlmConfig};
use crate::errors::LlmError;
use crate::events::PromptMetadataUpdated;

#[derive(Accounts)]
pub struct UpdatePromptMetadata<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    
    #[account(
        seeds = [b"llm_config"],
        bump = llm_config.bump,
        constraint = !llm_config.paused @ LlmError::ProgramPaused
    )]
    pub llm_config: Account<'info, LlmConfig>,
    
    #[account(
        mut,
        constraint = prompt_asset.owner == owner.key() @ LlmError::Unauthorized
    )]
    pub prompt_asset: Account<'info, PromptAsset>,
    
    pub clock: Sysvar<'info, Clock>,
}

pub fn handler(
    ctx: Context<UpdatePromptMetadata>,
    new_metadata_uri: String,
) -> Result<()> {
    let prompt_asset = &mut ctx.accounts.prompt_asset;
    let clock = Clock::get()?;
    
    // Validate new metadata URI
    require!(new_metadata_uri.len() <= 256, LlmError::InvalidMetadataUri);
    
    let old_metadata_uri = prompt_asset.metadata_uri.clone();
    
    // Update metadata
    prompt_asset.metadata_uri = new_metadata_uri;
    
    // Emit event
    emit!(PromptMetadataUpdated {
        prompt_asset: prompt_asset.key(),
        old_metadata_uri,
        new_metadata_uri: prompt_asset.metadata_uri.clone(),
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}
