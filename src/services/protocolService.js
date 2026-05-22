import { apiGet, apiPost } from './apiClient.js';

export async function getIDOState() {
  return apiGet('/api/protocol/ido/state');
  // Returns { status, raiseTarget, amountRaised, percentComplete, endTime, participants }
}

export async function getRebaseState() {
  return apiGet('/api/protocol/rebase/state');
  // Returns { index, lastRebaseTime, nextRebaseETA, oraclePrice, history: [] }
}

export async function getRewardsState(walletAddress) {
  return apiGet('/api/protocol/rewards/state', walletAddress ? { walletAddress } : {});
  // Returns { totalTVL, userStake, claimableRewards, lockTier, unlockTime }
}

export async function getGovernanceProposals(page = 1, limit = 10) {
  return apiGet('/api/protocol/governance/proposals', { page, limit });
  // Returns { items: [], total, page, limit }
}

export async function getProposal(id) {
  return apiGet(`/api/protocol/governance/proposals/${encodeURIComponent(id)}`);
}

export async function voteOnProposal(proposalId, vote, walletAddress) {
  return apiPost('/api/protocol/governance/vote', { proposalId, vote, walletAddress });
}

export async function getAttestationScore(walletAddress) {
  return apiGet('/api/protocol/attestation/score', { walletAddress });
  // Returns { score, tier, factors: [] }
}

export async function getAllProtocolState(walletAddress) {
  const [ido, rebase, rewards, governance, attestation] = await Promise.allSettled([
    getIDOState(),
    getRebaseState(),
    getRewardsState(walletAddress),
    getGovernanceProposals(1, 5),
    walletAddress ? getAttestationScore(walletAddress) : Promise.resolve(null),
  ]);

  return {
    ido: ido.status === 'fulfilled' ? ido.value : null,
    rebase: rebase.status === 'fulfilled' ? rebase.value : null,
    rewards: rewards.status === 'fulfilled' ? rewards.value : null,
    governance: governance.status === 'fulfilled' ? governance.value : null,
    attestation: attestation.status === 'fulfilled' ? attestation.value : null,
  };
}

export async function buyIDO(walletAddress, amount) {
  return apiPost('/api/protocol/ido/buy', { walletAddress, amount });
}

export async function stakeTokens(walletAddress, amount, lockTierDays) {
  return apiPost('/api/protocol/rewards/stake', { walletAddress, amount, lockTierDays });
}

export async function unstakeTokens(walletAddress, amount) {
  return apiPost('/api/protocol/rewards/unstake', { walletAddress, amount });
}

export async function claimRewards(walletAddress) {
  return apiPost('/api/protocol/rewards/claim', { walletAddress });
}

export async function proposeGovernanceAction(walletAddress, proposal) {
  return apiPost('/api/protocol/governance/propose', { walletAddress, ...proposal });
}

export default {
  getIDOState, getRebaseState, getRewardsState, getGovernanceProposals,
  getProposal, voteOnProposal, getAttestationScore, getAllProtocolState,
  buyIDO, stakeTokens, unstakeTokens, claimRewards, proposeGovernanceAction,
};
