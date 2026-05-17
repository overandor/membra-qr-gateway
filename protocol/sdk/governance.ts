import { PublicKey, TransactionInstruction, SystemProgram } from "@solana/web3.js";
import { Program, BN } from "@coral-xyz/anchor";
import {
  MEMBRA_GOVERNANCE_PROGRAM_ID,
  GOVERNANCE_SEED,
  PROPOSAL_SEED,
} from "./constants";
import type { GovernanceConfig, Proposal, ActionType, ProposalStatus } from "./types";

// ─── PDA helpers ─────────────────────────────────────────────────────────────

export function findGovernanceConfigPda(authority: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [GOVERNANCE_SEED, authority.toBuffer()],
    MEMBRA_GOVERNANCE_PROGRAM_ID
  );
}

export function findProposalPda(
  governanceConfig: PublicKey,
  proposalId: BN
): [PublicKey, number] {
  const idBytes = Buffer.alloc(8);
  idBytes.writeBigUInt64LE(BigInt(proposalId.toString()));
  return PublicKey.findProgramAddressSync(
    [PROPOSAL_SEED, governanceConfig.toBuffer(), idBytes],
    MEMBRA_GOVERNANCE_PROGRAM_ID
  );
}

// ─── Read helpers ─────────────────────────────────────────────────────────────

export async function fetchGovernanceConfig(
  program: Program<any>,
  authority: PublicKey
): Promise<GovernanceConfig | null> {
  const [pda] = findGovernanceConfigPda(authority);
  try {
    return (await program.account.governanceConfig.fetch(pda)) as GovernanceConfig;
  } catch {
    return null;
  }
}

export async function fetchProposal(
  program: Program<any>,
  governanceConfig: PublicKey,
  proposalId: BN
): Promise<Proposal | null> {
  const [pda] = findProposalPda(governanceConfig, proposalId);
  try {
    return (await program.account.proposal.fetch(pda)) as Proposal;
  } catch {
    return null;
  }
}

export async function fetchAllProposals(
  program: Program<any>,
  governanceConfig: PublicKey,
  config: GovernanceConfig
): Promise<Proposal[]> {
  const proposals: Proposal[] = [];
  for (let i = 0; i < config.proposalCount.toNumber(); i++) {
    const p = await fetchProposal(program, governanceConfig, new BN(i));
    if (p) proposals.push(p);
  }
  return proposals;
}

// ─── Write helpers ────────────────────────────────────────────────────────────

export async function buildInitializeGovernance(
  program: Program<any>,
  params: {
    authority: PublicKey;
    signers: PublicKey[];
    approvalThreshold: number;
    timelockSeconds: BN;
    executionWindowSeconds: BN;
    treasury: PublicKey;
  }
): Promise<TransactionInstruction> {
  const [govConfig] = findGovernanceConfigPda(params.authority);
  return program.methods
    .initializeGovernance(
      params.signers,
      params.approvalThreshold,
      params.timelockSeconds,
      params.executionWindowSeconds,
      params.treasury
    )
    .accounts({
      governanceConfig: govConfig,
      authority: params.authority,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

export async function buildProposeAction(
  program: Program<any>,
  params: {
    authority: PublicKey;
    governanceConfig: PublicKey;
    proposalId: BN;
    proposer: PublicKey;
    actionType: ActionType;
    description: string;
    actionData: Buffer;
  }
): Promise<TransactionInstruction> {
  const [proposal] = findProposalPda(params.governanceConfig, params.proposalId);
  return program.methods
    .proposeAction(params.actionType, params.description, Array.from(params.actionData))
    .accounts({
      governanceConfig: params.governanceConfig,
      proposal,
      proposer: params.proposer,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

export async function buildApproveAction(
  program: Program<any>,
  params: {
    governanceConfig: PublicKey;
    proposal: PublicKey;
    approver: PublicKey;
  }
): Promise<TransactionInstruction> {
  return program.methods
    .approveAction()
    .accounts({
      governanceConfig: params.governanceConfig,
      proposal: params.proposal,
      approver: params.approver,
    })
    .instruction();
}

export async function buildExecuteApprovedAction(
  program: Program<any>,
  params: {
    governanceConfig: PublicKey;
    proposal: PublicKey;
    executor: PublicKey;
  }
): Promise<TransactionInstruction> {
  return program.methods
    .executeApprovedAction()
    .accounts({
      governanceConfig: params.governanceConfig,
      proposal: params.proposal,
      executor: params.executor,
    })
    .instruction();
}

export async function buildCancelAction(
  program: Program<any>,
  params: {
    governanceConfig: PublicKey;
    proposal: PublicKey;
    canceller: PublicKey;
  }
): Promise<TransactionInstruction> {
  return program.methods
    .cancelAction()
    .accounts({
      governanceConfig: params.governanceConfig,
      proposal: params.proposal,
      canceller: params.canceller,
    })
    .instruction();
}

// ─── Status helpers ───────────────────────────────────────────────────────────

export function isProposalExecutable(proposal: Proposal, config: GovernanceConfig): {
  executable: boolean;
  reason?: string;
} {
  if (!("approved" in proposal.status)) {
    return { executable: false, reason: "Proposal is not in Approved status" };
  }

  const nowTs = Math.floor(Date.now() / 1000);
  const timelockEnd =
    proposal.approvedTs.toNumber() + config.timelockSeconds.toNumber();

  if (nowTs < timelockEnd) {
    const remaining = timelockEnd - nowTs;
    return {
      executable: false,
      reason: `Timelock active: ${remaining}s remaining`,
    };
  }

  const windowEnd = timelockEnd + config.executionWindowSeconds.toNumber();
  if (nowTs > windowEnd) {
    return { executable: false, reason: "Execution window has expired" };
  }

  return { executable: true };
}

export function describeProposalStatus(status: ProposalStatus): string {
  if ("pending" in status) return "Pending";
  if ("approved" in status) return "Approved";
  if ("executed" in status) return "Executed";
  if ("cancelled" in status) return "Cancelled";
  if ("expired" in status) return "Expired";
  return "Unknown";
}

export function describeActionType(actionType: ActionType): string {
  if ("withdrawFunds" in actionType) return "Withdraw Funds";
  if ("seedLiquidity" in actionType) return "Seed Liquidity";
  if ("burnUnsoldTokens" in actionType) return "Burn Unsold Tokens";
  if ("moveRewardsToVault" in actionType) return "Move Rewards to Vault";
  if ("updateRebaseParams" in actionType) return "Update Rebase Parameters";
  if ("pauseProtocol" in actionType) return "Pause Protocol";
  if ("resumeProtocol" in actionType) return "Resume Protocol";
  if ("updateGovernanceParams" in actionType) return "Update Governance Parameters";
  if ("emergencyPause" in actionType) return "Emergency Pause";
  return "Unknown Action";
}
