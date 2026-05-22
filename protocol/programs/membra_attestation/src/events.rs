use anchor_lang::prelude::*;

#[event]
pub struct ValidatorRegistered {
    pub validator: Pubkey,
    pub registered_at: i64,
}

#[event]
pub struct ValidatorStaked {
    pub validator: Pubkey,
    pub amount: u64,
    pub total_stake: u64,
}

#[event]
pub struct ProjectRegistered {
    pub project: Pubkey,
    pub builder: Pubkey,
    pub project_id: u64,
    pub submitted_at: i64,
}

#[event]
pub struct AttestationSubmitted {
    pub validator: Pubkey,
    pub project: Pubkey,
    pub job_type: u8,
    pub tech_score: u8,
    pub treasury_score: u8,
    pub tokenomics_score: u8,
    pub gov_score: u8,
    pub transparency_score: u8,
    pub attestation_count: u32,
}

#[event]
pub struct AttestationChallenged {
    pub challenger: Pubkey,
    pub attestation: Pubkey,
    pub validator_target: Pubkey,
    pub project: Pubkey,
}

#[event]
pub struct ChallengeResolved {
    pub attestation: Pubkey,
    pub upheld: bool,
    pub slash_amount: u64,
}

#[event]
pub struct ValidatorSlashed {
    pub validator: Pubkey,
    pub slash_amount: u64,
    pub remaining_stake: u64,
    pub reputation: u32,
}

#[event]
pub struct ValidatorRewarded {
    pub validator: Pubkey,
    pub amount: u64,
}

#[event]
pub struct ProjectScorePublished {
    pub project: Pubkey,
    pub tech_score: u8,
    pub treasury_score: u8,
    pub tokenomics_score: u8,
    pub gov_score: u8,
    pub transparency_score: u8,
    pub validator_confidence: u8,
    pub attestation_count: u32,
}
