// ─────────────────────────────────────────────────────────────────────────────
// MEMBRA QR Gateway — Solana Chain Configuration
// Program IDs match Anchor.toml
// ─────────────────────────────────────────────────────────────────────────────

export type SolanaCluster = "localnet" | "devnet" | "mainnet";

export interface ProgramIds {
  membraIdo: string;
  membraRebase: string;
  membraRewards: string;
  membraGovernance: string;
  membraAttestation: string;
}

export interface ChainConfig {
  cluster: SolanaCluster;
  rpc: string;
  wsRpc: string;
  explorer: string;
  explorerAddressBase: string;
  explorerTxBase: string;
  commitment: "processed" | "confirmed" | "finalized";
  programIds: ProgramIds;
}

const DEVNET_PROGRAM_IDS: ProgramIds = {
  membraIdo:          "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS",
  membraRebase:       "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkh476zPFsLnS",
  membraRewards:      "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYki476zPFsLnS",
  membraGovernance:   "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkj476zPFsLnS",
  membraAttestation:  "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkk476zPFsLnS",
};

export const chainsConfig: Record<SolanaCluster, ChainConfig> = {
  localnet: {
    cluster: "localnet",
    rpc: "http://127.0.0.1:8899",
    wsRpc: "ws://127.0.0.1:8900",
    explorer: "http://localhost:3000",
    explorerAddressBase: "http://localhost:3000/address",
    explorerTxBase: "http://localhost:3000/tx",
    commitment: "confirmed",
    programIds: {
      membraIdo:          "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS",
      membraRebase:       "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkh476zPFsLnS",
      membraRewards:      "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYki476zPFsLnS",
      membraGovernance:   "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkj476zPFsLnS",
      membraAttestation:  "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkk476zPFsLnS",
    },
  },

  devnet: {
    cluster: "devnet",
    rpc: "https://api.devnet.solana.com",
    wsRpc: "wss://api.devnet.solana.com",
    explorer: "https://explorer.solana.com?cluster=devnet",
    explorerAddressBase: "https://explorer.solana.com/address",
    explorerTxBase: "https://explorer.solana.com/tx",
    commitment: "confirmed",
    programIds: DEVNET_PROGRAM_IDS,
  },

  mainnet: {
    cluster: "mainnet",
    rpc: "https://api.mainnet-beta.solana.com",
    wsRpc: "wss://api.mainnet-beta.solana.com",
    explorer: "https://explorer.solana.com",
    explorerAddressBase: "https://explorer.solana.com/address",
    explorerTxBase: "https://explorer.solana.com/tx",
    commitment: "finalized",
    programIds: {
      // Mainnet program IDs — update after mainnet deployment
      membraIdo:          "MEMBRO_IDO_MAINNET_PROGRAM_ID_REPLACE_BEFORE_DEPLOY",
      membraRebase:       "MEMBRO_REBASE_MAINNET_PROGRAM_ID_REPLACE_BEFORE_DEPLOY",
      membraRewards:      "MEMBRO_REWARDS_MAINNET_PROGRAM_ID_REPLACE_BEFORE_DEPLOY",
      membraGovernance:   "MEMBRO_GOV_MAINNET_PROGRAM_ID_REPLACE_BEFORE_DEPLOY",
      membraAttestation:  "MEMBRO_ATTEST_MAINNET_PROGRAM_ID_REPLACE_BEFORE_DEPLOY",
    },
  },
} as const;

/** Resolve chain config from SOLANA_RPC_URL env var or explicit cluster name */
export function resolveChain(clusterOrEnv?: string): ChainConfig {
  const raw = clusterOrEnv ?? process.env.SOLANA_CLUSTER ?? "devnet";
  if (raw in chainsConfig) {
    return chainsConfig[raw as SolanaCluster];
  }
  // Detect by RPC URL
  const rpcUrl = process.env.SOLANA_RPC_URL ?? "";
  if (rpcUrl.includes("mainnet")) return chainsConfig.mainnet;
  if (rpcUrl.includes("127.0.0.1") || rpcUrl.includes("localhost")) return chainsConfig.localnet;
  return chainsConfig.devnet;
}

export type ChainsConfig = typeof chainsConfig;
