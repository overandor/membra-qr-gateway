/**
 * MEMBRA Protocol – on-chain program verification script.
 *
 * For each deployed program:
 *   1. Fetches the program account and confirms it is executable.
 *   2. Hashes the local .so binary and compares against the on-chain data hash.
 *   3. Checks that the upgrade authority matches the expected multisig / governance address.
 *   4. Prints a formatted verification report.
 *
 * Usage:
 *   ANCHOR_PROVIDER_URL=https://api.mainnet-beta.solana.com \
 *   ANCHOR_WALLET=~/.config/solana/id.json \
 *   EXPECTED_AUTHORITY=<governance-pubkey> \
 *   npx ts-node scripts/verify_programs.ts
 */

import { Connection, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

// ─── Configuration ────────────────────────────────────────────────────────────

const RPC_ENDPOINT =
  process.env.ANCHOR_PROVIDER_URL ?? "https://api.mainnet-beta.solana.com";

/**
 * Expected upgrade authority (governance multisig).
 * If set, each program's upgrade authority is checked against this pubkey.
 */
const EXPECTED_AUTHORITY = process.env.EXPECTED_AUTHORITY
  ? new PublicKey(process.env.EXPECTED_AUTHORITY)
  : null;

const BUILD_DIR = path.resolve(__dirname, "../target/deploy");

/** Programs to verify – (name, program ID). */
const PROGRAMS: Array<{ name: string; programId: string }> = [
  { name: "membra_ido", programId: "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS" },
  { name: "membra_rebase", programId: "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkh476zPFsLnS" },
  { name: "membra_rewards", programId: "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYki476zPFsLnS" },
  { name: "membra_governance", programId: "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkj476zPFsLnS" },
  { name: "membra_attestation", programId: "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkk476zPFsLnS" },
];

// BPFLoaderUpgradeable program – used to fetch upgrade authority
const BPF_UPGRADEABLE_LOADER = new PublicKey(
  "BPFLoaderUpgradeab1e11111111111111111111111"
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProgramVerificationResult {
  name: string;
  programId: string;
  executable: boolean;
  localBinaryFound: boolean;
  localBinaryHash: string | null;
  onChainDataHash: string | null;
  dataHashMatch: boolean | null;
  upgradeAuthority: string | null;
  authorityMatch: boolean | null;
  ownerProgram: string | null;
  dataSize: number | null;
  status: "PASS" | "FAIL" | "WARN";
  notes: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sha256File(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function sha256Buffer(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

/**
 * Derive the ProgramData PDA for a BPFLoaderUpgradeable program.
 * The PDA is `[program_id]` with no additional seeds – it is the same as the
 * program ID key but stored in a separate programdata account whose address is
 * stored in the program account data.
 *
 * We read the programdata address from the raw program account bytes
 * (offset 4 bytes discriminator + 32 bytes = the programdata pubkey).
 */
function parseProgramDataAddress(programAccountData: Buffer): PublicKey | null {
  // BPFLoaderUpgradeable program account layout:
  //   [0..4]   discriminator (u32, little-endian) = 2 (UpgradeableLoaderState::Program)
  //   [4..36]  programdata_address (Pubkey, 32 bytes)
  if (programAccountData.length < 36) return null;
  const discriminator = programAccountData.readUInt32LE(0);
  if (discriminator !== 2) return null; // not a Program variant
  return new PublicKey(programAccountData.slice(4, 36));
}

/**
 * Parse the upgrade authority from the ProgramData account.
 * ProgramData layout:
 *   [0..4]   discriminator = 3 (ProgramData)
 *   [4..12]  slot (u64)
 *   [12]     Option<Pubkey> tag (1 = Some, 0 = None)
 *   [13..45] Pubkey (if Some)
 *   [45..]   ELF data
 */
function parseUpgradeAuthority(programDataAccountData: Buffer): PublicKey | null {
  if (programDataAccountData.length < 13) return null;
  const discriminator = programDataAccountData.readUInt32LE(0);
  if (discriminator !== 3) return null;
  const hasSome = programDataAccountData[12] === 1;
  if (!hasSome) return null;
  if (programDataAccountData.length < 45) return null;
  return new PublicKey(programDataAccountData.slice(13, 45));
}

/**
 * Extract the ELF portion of the on-chain ProgramData account (after the 45-byte header).
 */
function extractElf(programDataAccountData: Buffer): Buffer {
  return programDataAccountData.slice(45);
}

// ─── Verification logic ───────────────────────────────────────────────────────

async function verifyProgram(
  connection: Connection,
  name: string,
  programId: string
): Promise<ProgramVerificationResult> {
  const result: ProgramVerificationResult = {
    name,
    programId,
    executable: false,
    localBinaryFound: false,
    localBinaryHash: null,
    onChainDataHash: null,
    dataHashMatch: null,
    upgradeAuthority: null,
    authorityMatch: null,
    ownerProgram: null,
    dataSize: null,
    status: "FAIL",
    notes: [],
  };

  const pk = new PublicKey(programId);

  // ── 1. Fetch program account ────────────────────────────────────────────────
  const programAccountInfo = await connection.getAccountInfo(pk, "finalized");

  if (!programAccountInfo) {
    result.notes.push("Program account not found on chain.");
    return result;
  }

  result.executable = programAccountInfo.executable;
  result.ownerProgram = programAccountInfo.owner.toBase58();

  if (!programAccountInfo.executable) {
    result.notes.push("Account is NOT executable.");
  }

  // ── 2. Parse programdata address ────────────────────────────────────────────
  const programData = programAccountInfo.data as Buffer;
  const programDataAddress = parseProgramDataAddress(programData);

  if (!programDataAddress) {
    result.notes.push("Could not parse ProgramData address – may not be BPFLoaderUpgradeable.");
  }

  let upgradeAuthority: PublicKey | null = null;
  let elfOnChain: Buffer | null = null;

  if (programDataAddress) {
    const pdaInfo = await connection.getAccountInfo(programDataAddress, "finalized");
    if (!pdaInfo) {
      result.notes.push(`ProgramData account ${programDataAddress.toBase58()} not found.`);
    } else {
      const pdaData = pdaInfo.data as Buffer;
      result.dataSize = pdaData.length;
      upgradeAuthority = parseUpgradeAuthority(pdaData);
      elfOnChain = extractElf(pdaData);
    }
  }

  // ── 3. Upgrade authority check ──────────────────────────────────────────────
  if (upgradeAuthority) {
    result.upgradeAuthority = upgradeAuthority.toBase58();
    if (EXPECTED_AUTHORITY) {
      result.authorityMatch = upgradeAuthority.equals(EXPECTED_AUTHORITY);
      if (!result.authorityMatch) {
        result.notes.push(
          `Upgrade authority mismatch! Expected: ${EXPECTED_AUTHORITY.toBase58()}, Got: ${upgradeAuthority.toBase58()}`
        );
      }
    } else {
      result.authorityMatch = null;
      result.notes.push("EXPECTED_AUTHORITY not set – skipping authority check.");
    }
  } else {
    result.notes.push("No upgrade authority found (immutable or not upgradeable).");
  }

  // ── 4. Local binary hash ────────────────────────────────────────────────────
  const localSoPath = path.join(BUILD_DIR, `${name}.so`);
  if (fs.existsSync(localSoPath)) {
    result.localBinaryFound = true;
    result.localBinaryHash = sha256File(localSoPath);
  } else {
    result.notes.push(`Local binary not found: ${localSoPath}`);
  }

  // ── 5. On-chain ELF hash ────────────────────────────────────────────────────
  if (elfOnChain && elfOnChain.length > 0) {
    result.onChainDataHash = sha256Buffer(elfOnChain);
  }

  // ── 6. Hash comparison ──────────────────────────────────────────────────────
  if (result.localBinaryHash && result.onChainDataHash) {
    result.dataHashMatch = result.localBinaryHash === result.onChainDataHash;
    if (!result.dataHashMatch) {
      result.notes.push(
        "Data hash MISMATCH – on-chain binary differs from local build."
      );
    }
  } else if (!result.localBinaryFound) {
    result.notes.push("Cannot compare hashes: local binary not available.");
  }

  // ── 7. Status determination ─────────────────────────────────────────────────
  const hardFail =
    !result.executable ||
    result.dataHashMatch === false ||
    result.authorityMatch === false;

  const softWarn =
    result.dataHashMatch === null ||
    result.authorityMatch === null ||
    !result.localBinaryFound;

  if (hardFail) {
    result.status = "FAIL";
  } else if (softWarn) {
    result.status = "WARN";
  } else {
    result.status = "PASS";
  }

  return result;
}

// ─── Report printer ───────────────────────────────────────────────────────────

function printReport(results: ProgramVerificationResult[]): void {
  const width = 70;
  const line = "=".repeat(width);
  const dline = "-".repeat(width);

  console.log("");
  console.log(line);
  console.log("  MEMBRA Protocol – Program Verification Report");
  console.log(`  RPC: ${RPC_ENDPOINT}`);
  console.log(`  Date: ${new Date().toISOString()}`);
  console.log(line);

  let allPass = true;

  for (const r of results) {
    const statusIcon = r.status === "PASS" ? "✓" : r.status === "WARN" ? "?" : "✗";
    console.log("");
    console.log(`${statusIcon}  ${r.name} [${r.status}]`);
    console.log(`   Program ID  : ${r.programId}`);
    console.log(`   Executable  : ${r.executable ? "yes" : "NO"}`);
    console.log(`   Owner       : ${r.ownerProgram ?? "n/a"}`);
    console.log(`   Authority   : ${r.upgradeAuthority ?? "none (immutable)"}`);
    if (EXPECTED_AUTHORITY) {
      console.log(
        `   Auth match  : ${r.authorityMatch === true ? "yes" : r.authorityMatch === false ? "NO" : "skipped"}`
      );
    }
    console.log(
      `   Local hash  : ${r.localBinaryHash ? r.localBinaryHash.slice(0, 20) + "..." : "n/a"}`
    );
    console.log(
      `   Chain hash  : ${r.onChainDataHash ? r.onChainDataHash.slice(0, 20) + "..." : "n/a"}`
    );
    console.log(
      `   Hash match  : ${r.dataHashMatch === true ? "yes" : r.dataHashMatch === false ? "NO" : "skipped"}`
    );
    if (r.dataSize) {
      console.log(`   Data size   : ${(r.dataSize / 1024).toFixed(1)} KB`);
    }
    if (r.notes.length > 0) {
      console.log("   Notes:");
      for (const note of r.notes) {
        console.log(`     - ${note}`);
      }
    }
    console.log(dline);

    if (r.status === "FAIL") allPass = false;
  }

  console.log("");
  if (allPass) {
    console.log("  Overall result: ALL CHECKS PASSED");
  } else {
    console.log("  Overall result: ONE OR MORE CHECKS FAILED");
    process.exitCode = 1;
  }
  console.log(line);
  console.log("");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("Connecting to:", RPC_ENDPOINT);

  const connection = new Connection(RPC_ENDPOINT, "finalized");

  // Smoke-test connectivity
  const slot = await connection.getSlot("finalized");
  console.log(`Connected. Current finalized slot: ${slot}`);
  console.log("");

  const results: ProgramVerificationResult[] = [];

  for (const p of PROGRAMS) {
    process.stdout.write(`  Verifying ${p.name}...`);
    try {
      const r = await verifyProgram(connection, p.name, p.programId);
      results.push(r);
      console.log(` [${r.status}]`);
    } catch (err) {
      console.log(" [ERROR]");
      results.push({
        name: p.name,
        programId: p.programId,
        executable: false,
        localBinaryFound: false,
        localBinaryHash: null,
        onChainDataHash: null,
        dataHashMatch: null,
        upgradeAuthority: null,
        authorityMatch: null,
        ownerProgram: null,
        dataSize: null,
        status: "FAIL",
        notes: [`Unexpected error: ${err instanceof Error ? err.message : String(err)}`],
      });
    }
  }

  printReport(results);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
