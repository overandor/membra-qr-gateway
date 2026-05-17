use anchor_lang::prelude::*;

/// Maximum number of multisig signers.
pub const MAX_SIGNERS: usize = 10;

/// Maximum number of approvals stored per proposal (mirrors MAX_SIGNERS).
pub const MAX_APPROVALS: usize = 10;

// ---------------------------------------------------------------------------
// Enumerations
// ---------------------------------------------------------------------------

/// The category of privileged action this proposal authorises.
///
/// The governance program does **not** execute funds transfers itself.
/// It acts as a pure authorization layer: once a proposal reaches
/// `ProposalStatus::Executed`, the target program (IDO, Rebase, Rewards, etc.)
/// checks that authorization on-chain before permitting the privileged operation.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Debug)]
pub enum ActionType {
    /// Withdraw SOL or SPL tokens from the protocol treasury.
    WithdrawFunds,
    /// Seed liquidity into a DEX pool using treasury funds.
    SeedLiquidity,
    /// Burn unsold IDO tokens remaining after an IDO closes.
    BurnUnsoldTokens,
    /// Move accrued rewards into the rewards vault for distribution.
    MoveRewardsToVault,
    /// Update rebase epoch / coefficient / band parameters.
    UpdateRebaseParams,
    /// Pause all protocol activity.
    PauseProtocol,
    /// Resume all protocol activity after a pause.
    ResumeProtocol,
    /// Change governance parameters (threshold, timelock, signers …).
    UpdateGovernanceParams,
    /// Emergency pause: bypasses the normal governance-paused guard so it
    /// can be proposed even while the protocol is already pausing.
    EmergencyPause,
}

impl ActionType {
    /// Returns a short human-readable label for use in events.
    pub fn as_str(&self) -> &'static str {
        match self {
            ActionType::WithdrawFunds => "WithdrawFunds",
            ActionType::SeedLiquidity => "SeedLiquidity",
            ActionType::BurnUnsoldTokens => "BurnUnsoldTokens",
            ActionType::MoveRewardsToVault => "MoveRewardsToVault",
            ActionType::UpdateRebaseParams => "UpdateRebaseParams",
            ActionType::PauseProtocol => "PauseProtocol",
            ActionType::ResumeProtocol => "ResumeProtocol",
            ActionType::UpdateGovernanceParams => "UpdateGovernanceParams",
            ActionType::EmergencyPause => "EmergencyPause",
        }
    }
}

/// Lifecycle state of a [`Proposal`].
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Debug)]
pub enum ProposalStatus {
    /// Created; collecting approvals.
    Pending,
    /// Approval threshold reached; waiting for the timelock to elapse.
    Approved,
    /// Timelock elapsed and the authorised action has been marked executed.
    Executed,
    /// Cancelled by a signer (or by multisig consensus for `Approved` proposals).
    Cancelled,
    /// The execution window expired without execution.
    Expired,
}

// ---------------------------------------------------------------------------
// Account: GovernanceConfig
// ---------------------------------------------------------------------------

/// Singleton PDA that stores all governance parameters and the signer set.
///
/// PDA seeds: `[b"governance", authority.key().as_ref()]`
///
/// Space = 8 (discriminator)
///   + 32  (authority)
///   + 32*MAX_SIGNERS (signers: 10 * 32 = 320)
///   + 1   (signer_count)
///   + 1   (approval_threshold)
///   + 8   (timelock_seconds)
///   + 8   (execution_window_seconds)
///   + 8   (proposal_count)
///   + 32  (treasury)
///   + 1   (paused)
///   + 1   (bump)
///   + 16  (padding / future)
///   = 436
#[account]
pub struct GovernanceConfig {
    /// The deployer / bootstrap authority.  Can add/remove signers and update
    /// governance params *only* via a governance proposal once the program is
    /// fully initialised.  During the initial `initialize_governance` call the
    /// authority populates the signer set directly.
    pub authority: Pubkey,

    /// Fixed-size array of multisig signer public keys.
    /// Only the first `signer_count` entries are active.
    pub signers: [Pubkey; MAX_SIGNERS],

    /// Number of active signers (indices 0..signer_count are valid).
    pub signer_count: u8,

    /// Minimum number of approvals required before a proposal can be executed.
    /// Must satisfy `1 <= approval_threshold <= signer_count`.
    pub approval_threshold: u8,

    /// Seconds that must pass after a proposal reaches `Approved` status
    /// before it may be executed.  0 is valid (no timelock) but ≥ 86 400 is
    /// strongly recommended for mainnet.
    pub timelock_seconds: i64,

    /// Seconds after the timelock elapses during which execution is allowed.
    /// If the window expires the proposal becomes `Expired` on the next
    /// `execute_approved_action` attempt.  Must be > 0.
    pub execution_window_seconds: i64,

    /// Monotonically-increasing counter; each new proposal gets `proposal_count`
    /// as its ID before the counter is incremented.
    pub proposal_count: u64,

    /// The treasury account (SOL or SPL) that this governance oversees.
    /// Stored here so that downstream programs can verify that a given
    /// governance config actually governs their treasury.
    pub treasury: Pubkey,

    /// When `true` no new proposals can be created (except `EmergencyPause`).
    pub paused: bool,

    /// PDA bump seed.
    pub bump: u8,
}

impl GovernanceConfig {
    /// On-disk size in bytes, including the 8-byte Anchor discriminator.
    pub const LEN: usize = 8    // discriminator
        + 32                    // authority
        + 32 * MAX_SIGNERS      // signers (10 * 32 = 320)
        + 1                     // signer_count
        + 1                     // approval_threshold
        + 8                     // timelock_seconds
        + 8                     // execution_window_seconds
        + 8                     // proposal_count
        + 32                    // treasury
        + 1                     // paused
        + 1                     // bump
        + 16;                   // padding / future fields

    /// Returns `true` if `key` is an active signer in this config.
    pub fn is_signer(&self, key: &Pubkey) -> bool {
        let active = self.signer_count as usize;
        self.signers[..active].contains(key)
    }
}

// ---------------------------------------------------------------------------
// Account: Proposal
// ---------------------------------------------------------------------------

/// Per-proposal PDA that records the full lifecycle of a governance action.
///
/// PDA seeds:
///   `[b"proposal", governance_config.key().as_ref(), proposal.id.to_le_bytes().as_ref()]`
///
/// Space = 8 (discriminator)
///   + 8   (id)
///   + 32  (proposer)
///   + 32  (governance)
///   + 1   (action_type discriminant + up to 0 payload bytes)
///   + 1   (status discriminant)
///   + 8   (created_ts)
///   + 8   (approved_ts)
///   + 8   (executed_ts)
///   + 1   (approval_count)
///   + 32*MAX_APPROVALS (approvals: 10 * 32 = 320)
///   + 4 + 256  (description: Vec prefix + bytes)
///   + 4 + 256  (action_data: Vec prefix + bytes)
///   + 1   (bump)
///   + 16  (padding / future)
///   ≈ 965 → use 1024 for clean alignment
#[account]
pub struct Proposal {
    /// Sequential ID assigned at creation (snapshot of `governance.proposal_count`).
    pub id: u64,

    /// Signer who submitted the proposal.
    pub proposer: Pubkey,

    /// The GovernanceConfig PDA this proposal belongs to.
    pub governance: Pubkey,

    /// What kind of action this proposal authorises.
    pub action_type: ActionType,

    /// Current lifecycle state.
    pub status: ProposalStatus,

    /// Unix timestamp when the proposal was created.
    pub created_ts: i64,

    /// Unix timestamp when the approval threshold was first reached.
    /// 0 until the proposal reaches `Approved`.
    pub approved_ts: i64,

    /// Unix timestamp when the proposal was executed.
    /// 0 until the proposal reaches `Executed`.
    pub executed_ts: i64,

    /// Number of unique approvals collected so far.
    pub approval_count: u8,

    /// Fixed-size array recording which signers have approved.
    /// Only the first `approval_count` entries are valid.
    pub approvals: [Pubkey; MAX_APPROVALS],

    /// Human-readable description (≤ 256 bytes, stored as a fixed array).
    /// Unused bytes are zeroed.
    pub description: [u8; 256],

    /// Serialised action-specific parameters (≤ 256 bytes).
    /// Interpretation is left to the target program / off-chain tooling.
    pub action_data: [u8; 256],

    /// PDA bump seed.
    pub bump: u8,
}

impl Proposal {
    /// On-disk size in bytes, including the 8-byte Anchor discriminator.
    pub const LEN: usize = 8   // discriminator
        + 8                    // id
        + 32                   // proposer
        + 32                   // governance
        + 2                    // action_type (enum discriminant; reserve 2 bytes for safety)
        + 2                    // status (enum discriminant; reserve 2 bytes)
        + 8                    // created_ts
        + 8                    // approved_ts
        + 8                    // executed_ts
        + 1                    // approval_count
        + 32 * MAX_APPROVALS   // approvals (10 * 32 = 320)
        + 256                  // description
        + 256                  // action_data
        + 1                    // bump
        + 31;                  // padding to 1024 − (sum above)

    /// Returns `true` if `key` has already registered an approval on this proposal.
    pub fn has_approved(&self, key: &Pubkey) -> bool {
        let active = self.approval_count as usize;
        self.approvals[..active].contains(key)
    }

    /// Returns `true` if the proposal is in a terminal state and cannot be
    /// further modified.
    pub fn is_terminal(&self) -> bool {
        matches!(
            self.status,
            ProposalStatus::Executed | ProposalStatus::Cancelled | ProposalStatus::Expired
        )
    }
}
