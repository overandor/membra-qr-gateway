use anchor_lang::prelude::*;

use crate::{
    errors::GovernanceError,
    events::ProposalCreated,
    state::{ActionType, GovernanceConfig, Proposal, ProposalStatus},
};

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

/// The `proposal_id` instruction arg is needed in the PDA seed derivation, so
/// it is declared via `#[instruction(...)]` to allow Anchor to forward it to
/// the seed derivation at account resolution time.
#[derive(Accounts)]
#[instruction(
    action_type: ActionType,
    description: String,
    action_data: Vec<u8>,
    proposal_id: u64,
)]
pub struct ProposeAction<'info> {
    /// The governance configuration this proposal belongs to.
    ///
    /// PDA seeds: `[b"governance", authority.key().as_ref()]`
    #[account(
        mut,
        seeds = [b"governance", governance_config.authority.as_ref()],
        bump = governance_config.bump,
    )]
    pub governance_config: Account<'info, GovernanceConfig>,

    /// The new proposal PDA.
    ///
    /// PDA seeds: `[b"proposal", governance_config.key().as_ref(), proposal_id.to_le_bytes()]`
    ///
    /// The `proposal_id` passed as an instruction argument must equal
    /// `governance_config.proposal_count` at the time of the call so that
    /// each proposal gets a unique, sequential seed.
    #[account(
        init,
        payer = proposer,
        space = Proposal::LEN,
        seeds = [
            b"proposal",
            governance_config.key().as_ref(),
            &proposal_id.to_le_bytes(),
        ],
        bump,
    )]
    pub proposal: Account<'info, Proposal>,

    /// The signer submitting this proposal.  Must be in the governance signer set.
    #[account(mut)]
    pub proposer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

/// Creates a new governance proposal.
///
/// # Parameters
/// - `action_type`   – the category of action being proposed.
/// - `description`   – human-readable rationale (≤ 255 bytes as UTF-8).
/// - `action_data`   – serialised action parameters (≤ 255 bytes).
/// - `proposal_id`   – must equal `governance_config.proposal_count`; used as
///   the PDA seed so it is passed explicitly by the caller.
pub fn handler(
    ctx: Context<ProposeAction>,
    action_type: ActionType,
    description: String,
    action_data: Vec<u8>,
    proposal_id: u64,
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let config = &mut ctx.accounts.governance_config;
    let proposer_key = ctx.accounts.proposer.key();

    // ---- Authorisation ---------------------------------------------------

    // Only registered signers may create proposals.
    require!(config.is_signer(&proposer_key), GovernanceError::NotASigner);

    // When paused, only EmergencyPause proposals are allowed so that the
    // multisig can record an on-chain authorisation to re-pause (useful after
    // a resume, for example).
    if config.paused {
        require!(
            action_type == ActionType::EmergencyPause,
            GovernanceError::GovernancePaused
        );
    }

    // ---- Payload validation ----------------------------------------------

    let desc_bytes = description.as_bytes();
    require!(desc_bytes.len() <= 255, GovernanceError::DescriptionTooLong);
    require!(
        action_data.len() <= 255,
        GovernanceError::ActionDataTooLarge
    );

    // The caller must pass the current proposal_count as the seed so the PDA
    // is derived correctly.  Enforce that here before incrementing.
    require!(
        proposal_id == config.proposal_count,
        GovernanceError::ArithmeticOverflow // re-use; indicates mismatch
    );

    // ---- Build description preview for event (first 64 chars) -----------

    let preview_end = desc_bytes.len().min(64);
    // SAFETY: desc_bytes is valid UTF-8 (came from a String), so slicing at a
    // char boundary is fine as long as the byte boundary is also a char boundary.
    // We scan backwards from preview_end to find the last valid UTF-8 boundary.
    let safe_end = find_utf8_boundary(desc_bytes, preview_end);
    let description_preview =
        String::from_utf8(desc_bytes[..safe_end].to_vec()).unwrap_or_default();

    let action_type_str = action_type.as_str().to_string();

    // ---- Copy description and action_data into fixed arrays --------------

    let mut desc_array = [0u8; 256];
    let copy_len = desc_bytes.len().min(256);
    desc_array[..copy_len].copy_from_slice(&desc_bytes[..copy_len]);

    let mut data_array = [0u8; 256];
    let data_len = action_data.len().min(256);
    data_array[..data_len].copy_from_slice(&action_data[..data_len]);

    // ---- Populate the proposal -------------------------------------------

    let proposal = &mut ctx.accounts.proposal;
    let bump = ctx.bumps.proposal;

    proposal.id = proposal_id;
    proposal.proposer = proposer_key;
    proposal.governance = config.key();
    proposal.action_type = action_type;
    proposal.status = ProposalStatus::Pending;
    proposal.created_ts = now;
    proposal.approved_ts = 0;
    proposal.executed_ts = 0;
    proposal.approval_count = 0;
    proposal.approvals = [Pubkey::default(); crate::state::MAX_APPROVALS];
    proposal.description = desc_array;
    proposal.action_data = data_array;
    proposal.bump = bump;

    // ---- Increment proposal counter in governance ------------------------

    config.proposal_count = config
        .proposal_count
        .checked_add(1)
        .ok_or(GovernanceError::ArithmeticOverflow)?;

    // ---- Emit event ------------------------------------------------------

    emit!(ProposalCreated {
        id: proposal.id,
        proposer: proposer_key,
        action_type_str,
        description_preview,
        ts: now,
    });

    Ok(())
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Walk backwards from `end` until we land on a valid UTF-8 character boundary.
/// This prevents emitting a malformed string preview in the event.
fn find_utf8_boundary(bytes: &[u8], end: usize) -> usize {
    let mut pos = end;
    while pos > 0 && (bytes[pos - 1] & 0b1100_0000) == 0b1000_0000 {
        pos -= 1;
    }
    pos
}
