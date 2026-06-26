use anchor_lang::prelude::*;

pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

pub use instructions::create_prompt_asset::*;
pub use instructions::submit_inference_request::*;
pub use instructions::record_inference_response::*;
pub use instructions::verify_merkle_proof::*;
pub use instructions::update_prompt_metadata::*;

declare_id!("MeLM111111111111111111111111111111111111111");

#[program]
pub mod membra_llm {
    use super::*;

    /// Create a new prompt asset on-chain
    /// 
    /// Prompts are tokenized assets that can be submitted for inference
    /// Each prompt has metadata, token cost, and ownership tracking
    pub fn create_prompt_asset(
        ctx: Context<CreatePromptAsset>,
        prompt_hash: [u8; 32],
        token_cost: u64,
        metadata_uri: String,
    ) -> Result<()> {
        instructions::create_prompt_asset::handler(ctx, prompt_hash, token_cost, metadata_uri)
    }

    /// Submit a prompt for inference processing
    /// 
    /// Burns the required tokens and creates an inference request transaction
    pub fn submit_inference_request(
        ctx: Context<SubmitInferenceRequest>,
        prompt_asset: Pubkey,
        model_id: String,
        parameters: Vec<u8>,
    ) -> Result<()> {
        instructions::submit_inference_request::handler(ctx, prompt_asset, model_id, parameters)
    }

    /// Record an LLM inference response as a transaction
    /// 
    /// The response is hashed and stored on-chain with merkle tree proof
    pub fn record_inference_response(
        ctx: Context<RecordInferenceResponse>,
        inference_request: Pubkey,
        response_hash: [u8; 32],
        merkle_root: [u8; 32],
        token_count: u64,
    ) -> Result<()> {
        instructions::record_inference_response::handler(
            ctx,
            inference_request,
            response_hash,
            merkle_root,
            token_count,
        )
    }

    /// Verify a merkle proof for an inference response
    /// 
    /// Ensures the response is part of the valid merkle tree
    pub fn verify_merkle_proof(
        ctx: Context<VerifyMerkleProof>,
        inference_response: Pubkey,
        merkle_proof: Vec<[u8; 32]>,
        leaf_index: u64,
    ) -> Result<()> {
        instructions::verify_merkle_proof::handler(ctx, inference_response, merkle_proof, leaf_index)
    }

    /// Update prompt metadata (owner only)
    pub fn update_prompt_metadata(
        ctx: Context<UpdatePromptMetadata>,
        new_metadata_uri: String,
    ) -> Result<()> {
        instructions::update_prompt_metadata::handler(ctx, new_metadata_uri)
    }
}
