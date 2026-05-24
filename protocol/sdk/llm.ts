import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

// ─── LLM Program Types ─────────────────────────────────────────────────────────────

export interface PromptAsset {
  owner: PublicKey;
  promptHash: Uint8Array;
  tokenCost: BN;
  metadataUri: string;
  usageCount: BN;
  createdAt: BN;
  bump: number;
}

export interface InferenceRequest {
  promptAsset: PublicKey;
  submitter: PublicKey;
  modelId: string;
  parameters: Uint8Array;
  status: InferenceStatus;
  response: PublicKey | null;
  submittedAt: BN;
  completedAt: BN | null;
  bump: number;
}

export interface InferenceResponse {
  inferenceRequest: PublicKey;
  responseHash: Uint8Array;
  merkleRoot: Uint8Array;
  tokenCount: BN;
  verified: boolean;
  verifiedAt: BN | null;
  recordedAt: BN;
  bump: number;
}

export interface MerkleTree {
  root: Uint8Array;
  leafCount: BN;
  depth: number;
  lastUpdated: BN;
  bump: number;
}

export interface TokenConfig {
  tokenMint: PublicKey;
  authority: PublicKey;
  supplyCap: BN;
  burnPerRequest: BN;
  bump: number;
}

export interface LlmConfig {
  authority: PublicKey;
  tokenConfig: PublicKey;
  paused: boolean;
  supportedModels: string;
  bump: number;
}

// ─── Enums ─────────────────────────────────────────────────────────────────────

export enum InferenceStatus {
  Pending = 0,
  Processing = 1,
  Completed = 2,
  Failed = 3,
}

// ─── Instruction Parameters ───────────────────────────────────────────────────────

export interface CreatePromptAssetParams {
  promptHash: Uint8Array;
  tokenCost: BN;
  metadataUri: string;
}

export interface SubmitInferenceRequestParams {
  promptAsset: PublicKey;
  modelId: string;
  parameters: Uint8Array;
}

export interface RecordInferenceResponseParams {
  inferenceRequest: PublicKey;
  responseHash: Uint8Array;
  merkleRoot: Uint8Array;
  tokenCount: BN;
}

export interface VerifyMerkleProofParams {
  inferenceResponse: PublicKey;
  merkleProof: Uint8Array[];
  leafIndex: BN;
}

export interface UpdatePromptMetadataParams {
  newMetadataUri: string;
}

// ─── PDA Helpers ─────────────────────────────────────────────────────────────────

export function findPromptAssetPda(
  owner: PublicKey,
  promptHash: Uint8Array
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("prompt_asset"), owner.toBuffer(), promptHash],
    new PublicKey("MlLm111111111111111111111111111111111111111")
  );
}

export function findInferenceRequestPda(
  promptAsset: PublicKey,
  submitter: PublicKey,
  timestamp: number
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("inference_request"),
      promptAsset.toBuffer(),
      submitter.toBuffer(),
      Buffer.from(timestamp.toString()),
    ],
    new PublicKey("MlLm111111111111111111111111111111111111111")
  );
}

export function findInferenceResponsePda(
  inferenceRequest: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("inference_response"), inferenceRequest.toBuffer()],
    new PublicKey("MlLm111111111111111111111111111111111111111")
  );
}

export function findMerkleTreePda(
  inferenceRequest: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("merkle_tree"), inferenceRequest.toBuffer()],
    new PublicKey("MlLm111111111111111111111111111111111111111")
  );
}

export function findLlmConfigPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("llm_config")],
    new PublicKey("MlLm111111111111111111111111111111111111111")
  );
}

export function findTokenConfigPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("token_config")],
    new PublicKey("MlLm111111111111111111111111111111111111111")
  );
}
