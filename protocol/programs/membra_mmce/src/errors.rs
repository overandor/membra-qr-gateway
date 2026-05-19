use anchor_lang::prelude::*;

#[error_code]
pub enum MmceError {
    #[msg("Caller is not authorized")]
    Unauthorized,

    #[msg("Invalid memory vault owner")]
    InvalidMemoryVaultOwner,

    #[msg("Invalid repo proof owner")]
    InvalidRepoProofOwner,

    #[msg("Invalid MIR receipt owner")]
    InvalidMirReceiptOwner,

    #[msg("MCR is not in a state that allows this operation")]
    InvalidMcrStatus,

    #[msg("MCR has already been revoked")]
    AlreadyRevoked,

    #[msg("MCR has already been scored")]
    AlreadyScored,

    #[msg("MCR has not been scored yet")]
    NotScored,

    #[msg("Collateral score exceeds maximum allowed value")]
    ScoreOutOfRange,

    #[msg("Appraisal range is invalid (low > high)")]
    InvalidAppraisalRange,

    #[msg("Risk discount exceeds 10000 bps (100%)")]
    RiskDiscountOutOfRange,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,

    #[msg("Invalid hash length")]
    InvalidHashLength,

    #[msg("MCR not found")]
    McrNotFound,

    #[msg("Repo proof not found")]
    RepoProofNotFound,

    #[msg("Memory vault not found")]
    MemoryVaultNotFound,

    #[msg("MIR receipt not found")]
    MirReceiptNotFound,

    #[msg("MCR must be in ReadyForAppraisal status")]
    NotReadyForAppraisal,

    #[msg("MCR has expired")]
    McrExpired,
}
