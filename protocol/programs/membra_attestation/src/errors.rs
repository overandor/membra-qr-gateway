use anchor_lang::prelude::*;

#[error_code]
pub enum AttestationError {
    #[msg("Unauthorized")]
    Unauthorized,

    #[msg("Protocol is paused")]
    ProtocolPaused,

    #[msg("Validator is already registered")]
    ValidatorAlreadyRegistered,

    #[msg("Stake amount must be greater than zero")]
    InvalidAmount,

    #[msg("Validator stake is below the required minimum")]
    InsufficientStake,

    #[msg("Project is not in a state that accepts attestations")]
    ProjectNotAcceptingAttestations,

    #[msg("Validator has already submitted an attestation for this project")]
    DuplicateAttestation,

    #[msg("Score values must be in the range 0–100")]
    InvalidScore,

    #[msg("Attestation is already challenged")]
    AlreadyChallenged,

    #[msg("Challenge is already resolved")]
    ChallengeAlreadyResolved,

    #[msg("Project score has already been published")]
    ScoreAlreadyPublished,

    #[msg("Not enough attestations to publish a score")]
    InsufficientAttestations,

    #[msg("Project is not in the Scoring state")]
    ProjectNotScoring,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,

    #[msg("Reward vault has insufficient balance")]
    RewardVaultInsufficient,

    #[msg("Validator has no stake to slash")]
    NoStakeToSlash,
}
