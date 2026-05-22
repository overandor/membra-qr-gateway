use anchor_lang::prelude::*;

/// Emitted once when `initialize_governance` succeeds.
#[event]
pub struct GovernanceInitialized {
    /// The bootstrap authority pubkey.
    pub authority: Pubkey,
    /// Number of signers registered at initialisation.
    pub signer_count: u8,
    /// Minimum approvals required to pass a proposal.
    pub approval_threshold: u8,
    /// Seconds of delay between approval and execution.
    pub timelock_seconds: i64,
    /// Seconds within which execution must occur after the timelock elapses.
    pub execution_window_seconds: i64,
    /// The treasury pubkey this governance oversees.
    pub treasury: Pubkey,
}

/// Emitted when a new proposal is created via `propose_action`.
#[event]
pub struct ProposalCreated {
    /// Proposal sequential ID.
    pub id: u64,
    /// Signer who submitted the proposal.
    pub proposer: Pubkey,
    /// Short label for the action type (e.g. "WithdrawFunds").
    pub action_type_str: String,
    /// First up-to-64 characters of the description for quick off-chain indexing.
    pub description_preview: String,
    /// Unix timestamp of creation.
    pub ts: i64,
}

/// Emitted each time a signer adds their approval via `approve_action`.
#[event]
pub struct ProposalApproved {
    /// Proposal sequential ID.
    pub id: u64,
    /// The signer who just approved.
    pub approver: Pubkey,
    /// Running total of approvals after this one.
    pub approval_count: u8,
    /// The threshold required.
    pub threshold: u8,
    /// Unix timestamp of this approval.
    pub ts: i64,
}

/// Emitted (in addition to [`ProposalApproved`]) when the approval count
/// first reaches the governance threshold, transitioning the proposal to
/// `Approved` status and starting the timelock.
#[event]
pub struct ProposalThresholdReached {
    /// Proposal sequential ID.
    pub id: u64,
    /// Total approvals at the moment the threshold was met.
    pub approval_count: u8,
    /// Unix timestamp when the threshold was crossed (= approved_ts).
    pub ts: i64,
}

/// Emitted when `execute_approved_action` successfully marks a proposal as
/// `Executed`.
#[event]
pub struct ProposalExecuted {
    /// Proposal sequential ID.
    pub id: u64,
    /// Signer who triggered execution.
    pub executor: Pubkey,
    /// Unix timestamp of execution.
    pub ts: i64,
}

/// Emitted when `cancel_action` transitions a proposal to `Cancelled`.
#[event]
pub struct ProposalCancelled {
    /// Proposal sequential ID.
    pub id: u64,
    /// Signer who initiated the cancellation.
    pub cancelled_by: Pubkey,
    /// Unix timestamp of cancellation.
    pub ts: i64,
}

/// Emitted when a new signer is added to the governance signer set.
#[event]
pub struct SignerAdded {
    /// The newly-added signer pubkey.
    pub signer: Pubkey,
    /// The authority or signer who submitted the addition.
    pub added_by: Pubkey,
    /// Unix timestamp.
    pub ts: i64,
}

/// Emitted when a signer is removed from the governance signer set.
#[event]
pub struct SignerRemoved {
    /// The removed signer pubkey.
    pub signer: Pubkey,
    /// The authority or signer who submitted the removal.
    pub removed_by: Pubkey,
    /// Unix timestamp.
    pub ts: i64,
}
