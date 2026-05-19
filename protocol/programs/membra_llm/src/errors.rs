use anchor_lang::prelude::*;

#[error_code]
pub enum LlmError {
    #[msg("Prompt asset already exists")]
    PromptAssetAlreadyExists,
    
    #[msg("Prompt asset not found")]
    PromptAssetNotFound,
    
    #[msg("Invalid prompt hash")]
    InvalidPromptHash,
    
    #[msg("Insufficient token balance")]
    InsufficientTokenBalance,
    
    #[msg("Inference request not found")]
    InferenceRequestNotFound,
    
    #[msg("Inference request already completed")]
    InferenceRequestAlreadyCompleted,
    
    #[msg("Invalid inference status transition")]
    InvalidStatusTransition,
    
    #[msg("Invalid merkle proof")]
    InvalidMerkleProof,
    
    #[msg("Merkle tree not found")]
    MerkleTreeNotFound,
    
    #[msg("Unauthorized access")]
    Unauthorized,
    
    #[msg("Program is paused")]
    ProgramPaused,
    
    #[msg("Invalid model ID")]
    InvalidModelId,
    
    #[msg("Model not supported")]
    ModelNotSupported,
    
    #[msg("Invalid metadata URI")]
    InvalidMetadataUri,
    
    #[msg("Token config not found")]
    TokenConfigNotFound,
    
    #[msg("Supply cap exceeded")]
    SupplyCapExceeded,
    
    #[msg("Invalid parameters")]
    InvalidParameters,
    
    #[msg("Response already verified")]
    ResponseAlreadyVerified,
    
    #[msg("Invalid leaf index")]
    InvalidLeafIndex,
    
    #[msg("Llm config not found")]
    LlmConfigNotFound,
    
    #[msg("Invalid authority")]
    InvalidAuthority,
}
