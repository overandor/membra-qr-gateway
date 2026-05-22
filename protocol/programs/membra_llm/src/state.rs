use anchor_lang::prelude::*;

/// Prompt Asset - represents a tokenized prompt that can be submitted for inference
#[account]
pub struct PromptAsset {
    /// Owner of the prompt asset
    pub owner: Pubkey,
    
    /// SHA-256 hash of the prompt content
    pub prompt_hash: [u8; 32],
    
    /// Token cost to use this prompt for inference
    pub token_cost: u64,
    
    /// URI for metadata (IPFS, Arweave, or GitHub)
    pub metadata_uri: String,
    
    /// Number of times this prompt has been used for inference
    pub usage_count: u64,
    
    /// Timestamp when the prompt was created
    pub created_at: i64,
    
    /// Bump seed for PDA
    pub bump: u8,
}

/// Inference Request - represents a submitted inference job
#[account]
pub struct InferenceRequest {
    /// The prompt asset being used
    pub prompt_asset: Pubkey,
    
    /// User submitting the request
    pub submitter: Pubkey,
    
    /// Model identifier (e.g., "gpt-4", "claude-3", "llama-2-70b")
    pub model_id: String,
    
    /// Additional model parameters (serialized)
    pub parameters: Vec<u8>,
    
    /// Status of the request
    pub status: InferenceStatus,
    
    /// Associated inference response (if completed)
    pub response: Option<Pubkey>,
    
    /// Timestamp when request was submitted
    pub submitted_at: i64,
    
    /// Timestamp when request was completed
    pub completed_at: Option<i64>,
    
    /// Bump seed for PDA
    pub bump: u8,
}

/// Inference Response - represents a completed inference transaction
#[account]
pub struct InferenceResponse {
    /// The inference request this response belongs to
    pub inference_request: Pubkey,
    
    /// SHA-256 hash of the LLM response
    pub response_hash: [u8; 32],
    
    /// Merkle root of the response proof tree
    pub merkle_root: [u8; 32],
    
    /// Number of tokens in the response
    pub token_count: u64,
    
    /// Whether the response has been verified
    pub verified: bool,
    
    /// Verification timestamp
    pub verified_at: Option<i64>,
    
    /// Timestamp when response was recorded
    pub recorded_at: i64,
    
    /// Bump seed for PDA
    pub bump: u8,
}

/// Merkle Tree State - stores the root and metadata for a proof tree
#[account]
pub struct MerkleTree {
    /// Current merkle root
    pub root: [u8; 32],
    
    /// Number of leaves in the tree
    pub leaf_count: u64,
    
    /// Depth of the tree
    pub depth: u8,
    
    /// Timestamp of last update
    pub last_updated: i64,
    
    /// Bump seed for PDA
    pub bump: u8,
}

/// Inference status enum
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum InferenceStatus {
    /// Request submitted, pending processing
    Pending,
    /// Currently being processed
    Processing,
    /// Response recorded successfully
    Completed,
    /// Request failed
    Failed,
}

impl Default for InferenceStatus {
    fn default() -> Self {
        InferenceStatus::Pending
    }
}

/// Token Mint Config - configuration for the inference token
#[account]
pub struct TokenConfig {
    /// The token mint address
    pub token_mint: Pubkey,
    
    /// Authority that can mint/burn tokens
    pub authority: Pubkey,
    
    /// Total supply cap (0 = uncapped)
    pub supply_cap: u64,
    
    /// Tokens burned per inference request
    pub burn_per_request: u64,
    
    /// Bump seed for PDA
    pub bump: u8,
}

/// Global LLM Config - program-wide configuration
#[account]
pub struct LlmConfig {
    /// Program authority
    pub authority: Pubkey,
    
    /// Token config account
    pub token_config: Pubkey,
    
    /// Whether the program is paused
    pub paused: bool,
    
    /// Supported models (comma-separated list)
    pub supported_models: String,
    
    /// Bump seed for PDA
    pub bump: u8,
}
