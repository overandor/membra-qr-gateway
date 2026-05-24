/**
 * MEMBRA Protocol – Unified client.
 *
 * `MembraClient` is the single entry-point for applications that need to
 * interact with all five MEMBRA programs.  It wires up Anchor providers,
 * handles connection retry, and exposes program-specific sub-clients.
 */

import {
  Connection,
  Commitment,
  PublicKey,
  TransactionSignature,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  AnchorProvider,
  Program,
  Wallet,
  BN,
} from "@coral-xyz/anchor";
import {
  MEMBRA_IDO_PROGRAM_ID,
  MEMBRA_REBASE_PROGRAM_ID,
  MEMBRA_REWARDS_PROGRAM_ID,
  MEMBRA_GOVERNANCE_PROGRAM_ID,
  MEMBRA_ATTESTATION_PROGRAM_ID,
} from "./constants";
import { AttestationClient } from "./attestation";
import { NetworkError } from "./errors";

// ─── Re-export sub-client types ───────────────────────────────────────────────

export type { AttestationClient };

// ─── Cluster helpers ──────────────────────────────────────────────────────────

export type ClusterName = "localnet" | "devnet" | "mainnet-beta";

const DEFAULT_RPC: Record<ClusterName, string> = {
  localnet: "http://127.0.0.1:8899",
  devnet: "https://api.devnet.solana.com",
  "mainnet-beta": "https://api.mainnet-beta.solana.com",
};

/** Commitment level appropriate for each cluster. */
const CLUSTER_COMMITMENT: Record<ClusterName, Commitment> = {
  localnet: "confirmed",
  devnet: "confirmed",
  "mainnet-beta": "finalized",
};

// ─── Network info ─────────────────────────────────────────────────────────────

export interface NetworkInfo {
  cluster: ClusterName;
  rpcEndpoint: string;
  slot: number;
  blockTime: number | null;
  solBalance: number;
  commitment: Commitment;
}

// ─── Retry configuration ──────────────────────────────────────────────────────

export interface RetryConfig {
  /** Maximum number of attempts (default: 3). */
  maxAttempts: number;
  /** Base delay in milliseconds between attempts (default: 1500). */
  baseDelayMs: number;
  /** Exponential backoff multiplier (default: 2). */
  backoffMultiplier: number;
}

const DEFAULT_RETRY: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1500,
  backoffMultiplier: 2,
};

// ─── MembraClient ─────────────────────────────────────────────────────────────

/**
 * Unified MEMBRA protocol client.
 *
 * Usage:
 * ```ts
 * const client = await MembraClient.create(wallet, "devnet");
 * const score = await client.attestation.getProjectScore(builder, projectId);
 * ```
 */
export class MembraClient {
  public readonly connection: Connection;
  public readonly provider: AnchorProvider;
  public readonly cluster: ClusterName;
  public readonly commitment: Commitment;

  // ─── Raw Anchor programs (typed as Program<any> until IDLs are generated) ──

  public readonly idoProgram: Program<any>;
  public readonly rebaseProgram: Program<any>;
  public readonly rewardsProgram: Program<any>;
  public readonly governanceProgram: Program<any>;
  public readonly attestationProgram: Program<any>;

  // ─── High-level sub-clients ─────────────────────────────────────────────────

  public readonly attestation: AttestationClient;

  // ─── Retry config ────────────────────────────────────────────────────────────

  private readonly retry: RetryConfig;

  // ─── Constructor ─────────────────────────────────────────────────────────────

  private constructor(
    connection: Connection,
    provider: AnchorProvider,
    cluster: ClusterName,
    commitment: Commitment,
    retry: RetryConfig
  ) {
    this.connection = connection;
    this.provider = provider;
    this.cluster = cluster;
    this.commitment = commitment;
    this.retry = retry;

    // Build stub programs using only the program ID. Callers may replace these
    // with fully-typed programs by passing an IDL via MembraClient.withIdls().
    this.idoProgram = MembraClient.buildStubProgram(MEMBRA_IDO_PROGRAM_ID, provider);
    this.rebaseProgram = MembraClient.buildStubProgram(MEMBRA_REBASE_PROGRAM_ID, provider);
    this.rewardsProgram = MembraClient.buildStubProgram(MEMBRA_REWARDS_PROGRAM_ID, provider);
    this.governanceProgram = MembraClient.buildStubProgram(MEMBRA_GOVERNANCE_PROGRAM_ID, provider);
    this.attestationProgram = MembraClient.buildStubProgram(MEMBRA_ATTESTATION_PROGRAM_ID, provider);

    this.attestation = new AttestationClient(this.attestationProgram, provider);
  }

  // ─── Factory methods ─────────────────────────────────────────────────────────

  /**
   * Create a MembraClient connected to the given cluster.
   *
   * @param wallet   Anchor-compatible wallet (NodeWallet / anchor.Wallet).
   * @param cluster  One of "localnet" | "devnet" | "mainnet-beta".
   * @param rpcUrl   Custom RPC endpoint URL (overrides the cluster default).
   * @param retry    Retry configuration for waitForConfirmation.
   */
  static create(
    wallet: Wallet,
    cluster: ClusterName,
    rpcUrl?: string,
    retry: Partial<RetryConfig> = {}
  ): MembraClient {
    const endpoint = rpcUrl ?? DEFAULT_RPC[cluster];
    const commitment = CLUSTER_COMMITMENT[cluster];
    const connection = new Connection(endpoint, commitment);
    const provider = new AnchorProvider(connection, wallet, {
      commitment,
      preflightCommitment: commitment,
      skipPreflight: cluster === "localnet",
    });
    const retryConfig: RetryConfig = { ...DEFAULT_RETRY, ...retry };
    return new MembraClient(connection, provider, cluster, commitment, retryConfig);
  }

  /**
   * Create a MembraClient from an existing AnchorProvider.
   * The cluster defaults to "devnet" unless provided.
   */
  static fromProvider(
    provider: AnchorProvider,
    cluster: ClusterName = "devnet",
    retry: Partial<RetryConfig> = {}
  ): MembraClient {
    const commitment = CLUSTER_COMMITMENT[cluster];
    const retryConfig: RetryConfig = { ...DEFAULT_RETRY, ...retry };
    return new MembraClient(
      provider.connection,
      provider,
      cluster,
      commitment,
      retryConfig
    );
  }

  // ─── Stub program builder ─────────────────────────────────────────────────────

  /**
   * Build a minimal Program-like stub that can be type-cast to Program<any>.
   * Callers who need full method resolution must load the IDL manually:
   *   const prog = new Program(idl, programId, provider);
   *   client.idoProgram = prog;
   */
  private static buildStubProgram(
    programId: PublicKey,
    provider: AnchorProvider
  ): Program<any> {
    // Minimal IDL that satisfies Anchor's Program constructor.
    const stubIdl = {
      version: "0.1.0",
      name: "stub",
      instructions: [],
      accounts: [],
      types: [],
      errors: [],
    };
    return new Program(stubIdl as any, programId, provider);
  }

  // ─── Utility methods ─────────────────────────────────────────────────────────

  /**
   * Fetch basic network information for the connected cluster.
   */
  async getNetworkInfo(): Promise<NetworkInfo> {
    const slot = await this.connection.getSlot(this.commitment);
    const blockTime = await this.connection.getBlockTime(slot);
    const solBalance = await this.connection
      .getBalance(this.provider.wallet.publicKey, this.commitment)
      .then((lamports) => lamports / LAMPORTS_PER_SOL)
      .catch(() => 0);

    return {
      cluster: this.cluster,
      rpcEndpoint: this.connection.rpcEndpoint,
      slot,
      blockTime,
      solBalance,
      commitment: this.commitment,
    };
  }

  /**
   * Wait for a transaction to reach the configured commitment level.
   *
   * Retries up to `retry.maxAttempts` times with exponential backoff.
   * Throws `NetworkError` if the transaction is not confirmed within the
   * attempt budget.
   *
   * @param txSig        Base-58 transaction signature returned by `sendAndConfirm`.
   * @param maxAttempts  Override the instance-level retry count.
   */
  async waitForConfirmation(
    txSig: TransactionSignature,
    maxAttempts = this.retry.maxAttempts
  ): Promise<void> {
    let delay = this.retry.baseDelayMs;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const status = await this.connection.getSignatureStatus(txSig, {
        searchTransactionHistory: true,
      });

      const confirmationStatus = status.value?.confirmationStatus;

      if (
        confirmationStatus === "confirmed" ||
        confirmationStatus === "finalized"
      ) {
        if (this.commitment === "finalized" && confirmationStatus !== "finalized") {
          // For mainnet we require finalization; keep waiting.
        } else {
          return;
        }
      }

      if (status.value?.err) {
        throw new NetworkError(
          `Transaction ${txSig} failed on-chain: ${JSON.stringify(status.value.err)}`
        );
      }

      if (attempt < maxAttempts) {
        await sleep(delay);
        delay = Math.round(delay * this.retry.backoffMultiplier);
      }
    }

    throw new NetworkError(
      `Transaction ${txSig} was not confirmed after ${maxAttempts} attempts`
    );
  }

  /**
   * Convenience: send a raw transaction with retry-aware confirmation.
   */
  async sendWithConfirmation(
    tx: import("@solana/web3.js").Transaction,
    signers: import("@solana/web3.js").Signer[] = []
  ): Promise<TransactionSignature> {
    const sig = await this.provider.sendAndConfirm(tx, signers);
    await this.waitForConfirmation(sig);
    return sig;
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
