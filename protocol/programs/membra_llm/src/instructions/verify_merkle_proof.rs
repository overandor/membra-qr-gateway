use anchor_lang::prelude::*;
use sha2::{Sha256, Digest};

use crate::state::{InferenceResponse, MerkleTree, LlmConfig};
use crate::errors::LlmError;
use crate::events::MerkleProofVerified;

#[derive(Accounts)]
pub struct VerifyMerkleProof<'info> {
    pub verifier: Signer<'info>,
    
    #[account(
        seeds = [b"llm_config"],
        bump = llm_config.bump,
        constraint = !llm_config.paused @ LlmError::ProgramPaused
    )]
    pub llm_config: Account<'info, LlmConfig>,
    
    #[account(
        mut,
        constraint = !inference_response.verified @ LlmError::ResponseAlreadyVerified
    )]
    pub inference_response: Account<'info, InferenceResponse>,
    
    #[account(
        seeds = [b"merkle_tree", inference_response.inference_request.as_ref()],
        bump = merkle_tree.bump
    )]
    pub merkle_tree: Account<'info, MerkleTree>,
    
    pub clock: Sysvar<'info, Clock>,
}

pub fn handler(
    ctx: Context<VerifyMerkleProof>,
    inference_response: Pubkey,
    merkle_proof: Vec<[u8; 32]>,
    leaf_index: u64,
) -> Result<()> {
    let inference_response_acc = &mut ctx.accounts.inference_response;
    let merkle_tree = &ctx.accounts.merkle_tree;
    let clock = Clock::get()?;
    
    // Validate leaf index
    require!(leaf_index < merkle_tree.leaf_count, LlmError::InvalidLeafIndex);
    
    // Compute the merkle root from the proof
    let computed_root = compute_merkle_root_from_proof(
        inference_response_acc.response_hash,
        merkle_proof,
        leaf_index,
        merkle_tree.depth,
    )?;
    
    // Verify the computed root matches the stored root
    require!(
        computed_root == merkle_tree.root,
        LlmError::InvalidMerkleProof
    );
    
    // Mark response as verified
    inference_response_acc.verified = true;
    inference_response_acc.verified_at = Some(clock.unix_timestamp);
    
    // Emit event
    emit!(MerkleProofVerified {
        inference_response: inference_response.key(),
        leaf_index,
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}

fn compute_merkle_root_from_proof(
    leaf: [u8; 32],
    proof: Vec<[u8; 32]>,
    leaf_index: u64,
    depth: u8,
) -> Result<[u8; 32]> {
    let mut current_hash = leaf;
    let mut current_index = leaf_index;
    
    for (i, proof_element) in proof.iter().enumerate() {
        if i as u8 >= depth {
            break;
        }
        
        let mut hasher = Sha256::new();
        
        // Determine if the current hash is the left or right sibling
        if current_index % 2 == 0 {
            hasher.update(current_hash);
            hasher.update(proof_element);
        } else {
            hasher.update(proof_element);
            hasher.update(current_hash);
        }

        current_hash = hasher.finalize().into();
        current_index /= 2;
    }
    
    Ok(current_hash)
}
