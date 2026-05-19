use anchor_lang::prelude::*;

/// Event emitted when a prompt asset is created
#[event]
pub struct PromptAssetCreated {
    pub prompt_asset: Pubkey,
    pub owner: Pubkey,
    pub prompt_hash: [u8; 32],
    pub token_cost: u64,
    pub timestamp: i64,
}

/// Event emitted when an inference request is submitted
#[event]
pub struct InferenceRequestSubmitted {
    pub inference_request: Pubkey,
    pub prompt_asset: Pubkey,
    pub submitter: Pubkey,
    pub model_id: String,
    pub timestamp: i64,
}

/// Event emitted when an inference response is recorded
#[event]
pub struct InferenceResponseRecorded {
    pub inference_response: Pubkey,
    pub inference_request: Pubkey,
    pub response_hash: [u8; 32],
    pub merkle_root: [u8; 32],
    pub token_count: u64,
    pub timestamp: i64,
}

/// Event emitted when a merkle proof is verified
#[event]
pub struct MerkleProofVerified {
    pub inference_response: Pubkey,
    pub leaf_index: u64,
    pub timestamp: i64,
}

/// Event emitted when prompt metadata is updated
#[event]
pub struct PromptMetadataUpdated {
    pub prompt_asset: Pubkey,
    pub old_metadata_uri: String,
    pub new_metadata_uri: String,
    pub timestamp: i64,
}

/// Event emitted when the merkle tree is updated
#[event]
pub struct MerkleTreeUpdated {
    pub merkle_tree: Pubkey,
    pub new_root: [u8; 32],
    pub leaf_count: u64,
    pub timestamp: i64,
}
