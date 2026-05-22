use anchor_lang::prelude::*;

#[error_code]
pub enum GovernanceError {
    /// The caller is not the governance authority.
    #[msg("Unauthorized: caller is not the governance authority")]
    Unauthorized,

    /// The caller is not a registered multisig signer.
    #[msg("Not a signer: caller is not in the governance signer set")]
    NotASigner,

    /// This signer has already submitted an approval for this proposal.
    #[msg("Already approved: signer has already approved this proposal")]
    AlreadyApproved,

    /// The proposal is not in `Pending` status.
    #[msg("Proposal is not pending")]
    ProposalNotPending,

    /// The proposal is not in `Approved` status.
    #[msg("Proposal is not approved")]
    ProposalNotApproved,

    /// The proposal cannot be executed in its current state.
    #[msg("Proposal is not executable")]
    ProposalNotExecutable,

    /// The timelock period has not yet elapsed since approval.
    #[msg("Timelock has not elapsed yet")]
    TimelockNotElapsed,

    /// The execution window has expired; the proposal is now stale.
    #[msg("Execution window has expired")]
    ExecutionWindowExpired,

    /// The number of approvals has not reached the required threshold.
    #[msg("Approval threshold not met")]
    ThresholdNotMet,

    /// `approval_threshold` is zero or exceeds the number of signers.
    #[msg("Invalid threshold: must be >= 1 and <= signer count")]
    InvalidThreshold,

    /// `timelock_seconds` is negative.
    #[msg("Invalid timelock: must be >= 0")]
    InvalidTimelockSeconds,

    /// Adding a signer would exceed MAX_SIGNERS.
    #[msg("Max signers reached")]
    MaxSignersReached,

    /// The supplied signer pubkey was not found in the signer set.
    #[msg("Signer not found in governance signer set")]
    SignerNotFound,

    /// The action type provided is not valid in the current context.
    #[msg("Invalid action type")]
    InvalidActionType,

    /// The `action_data` payload exceeds the 256-byte limit.
    #[msg("Action data too large: must be <= 256 bytes")]
    ActionDataTooLarge,

    /// The governance is paused; no new proposals may be created.
    #[msg("Governance is paused")]
    GovernancePaused,

    /// The proposal has expired (execution window passed without execution).
    #[msg("Proposal has expired")]
    ProposalExpired,

    /// There are not enough approvals to perform the requested operation.
    #[msg("Insufficient approvals")]
    InsufficientApprovals,

    /// An arithmetic operation overflowed or underflowed.
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,

    /// The treasury pubkey is the default (zero) pubkey.
    #[msg("Invalid treasury: pubkey must not be the default")]
    InvalidTreasury,

    /// A treasury transfer CPI failed.
    #[msg("Treasury transfer failed")]
    TreasuryTransferFailed,

    /// `execution_window_seconds` is zero or negative.
    #[msg("Invalid execution window: must be > 0")]
    InvalidExecutionWindow,

    /// The `description` string exceeds the 255-byte limit.
    #[msg("Description too long: must be <= 255 bytes")]
    DescriptionTooLong,

    /// The signer set must have at least one member.
    #[msg("At least one signer is required")]
    NoSigners,
}
