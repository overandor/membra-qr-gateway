/**
 * MEMBRA Protocol – IDL and TypeScript type export script.
 *
 * Reads target/idl/*.json, combines them into a single IDLs.json manifest,
 * and copies target/types/*.ts into sdk/ with a generated version header.
 *
 * Usage:
 *   npx ts-node scripts/export_idls.ts
 *
 * Optional env vars:
 *   IDL_DIR      Override for the IDL source directory  (default: target/idl)
 *   TYPES_DIR    Override for the types source directory (default: target/types)
 *   SDK_DIR      Override for the output SDK directory   (default: sdk/)
 *   OUT_DIR      Override for combined IDL output dir    (default: target/idl)
 */

import * as fs from "fs";
import * as path from "path";

// ─── Configuration ────────────────────────────────────────────────────────────

const PROTOCOL_ROOT = path.resolve(__dirname, "..");
const IDL_DIR = process.env.IDL_DIR ?? path.join(PROTOCOL_ROOT, "target", "idl");
const TYPES_DIR = process.env.TYPES_DIR ?? path.join(PROTOCOL_ROOT, "target", "types");
const SDK_DIR = process.env.SDK_DIR ?? path.join(PROTOCOL_ROOT, "sdk");
const OUT_DIR = process.env.OUT_DIR ?? path.join(PROTOCOL_ROOT, "target", "idl");

const KNOWN_PROGRAMS = [
  "membra_ido",
  "membra_rebase",
  "membra_rewards",
  "membra_governance",
  "membra_attestation",
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Generate the version header prepended to each copied .ts type file. */
function buildVersionHeader(programName: string, idlVersion: string): string {
  return [
    `/**`,
    ` * MEMBRA Protocol – auto-generated Anchor types.`,
    ` * Program  : ${programName}`,
    ` * IDL ver  : ${idlVersion}`,
    ` * Exported : ${nowIso()}`,
    ` *`,
    ` * DO NOT EDIT – regenerate by running: npx ts-node scripts/export_idls.ts`,
    ` */`,
    ``,
  ].join("\n");
}

/** Read a JSON file and return the parsed object. */
function readJson(filePath: string): Record<string, unknown> {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as Record<string, unknown>;
}

/** Write a file, creating parent directories if needed. */
function writeFile(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf-8");
}

/** Count the number of entries in an array field of an IDL. */
function countIdlEntries(idl: Record<string, unknown>, field: string): number {
  return Array.isArray(idl[field]) ? (idl[field] as unknown[]).length : 0;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const timestamp = nowIso();
  console.log("MEMBRA Protocol – IDL Export");
  console.log(`Timestamp : ${timestamp}`);
  console.log(`IDL dir   : ${IDL_DIR}`);
  console.log(`Types dir : ${TYPES_DIR}`);
  console.log(`SDK dir   : ${SDK_DIR}`);
  console.log("");

  // Check IDL directory exists
  if (!fs.existsSync(IDL_DIR)) {
    console.error(
      `IDL directory not found: ${IDL_DIR}\n` +
      `Run 'anchor build' to generate IDL files before running this script.`
    );
    process.exit(1);
  }

  // Discover IDL files
  const allIdlFiles = fs
    .readdirSync(IDL_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();

  if (allIdlFiles.length === 0) {
    console.error("No IDL JSON files found. Run 'anchor build' first.");
    process.exit(1);
  }

  console.log(`Found ${allIdlFiles.length} IDL file(s):\n`);

  // ── Build combined IDLs manifest ────────────────────────────────────────────

  const combinedIdls: Record<string, unknown> = {
    generated: timestamp,
    schema: "membra-idls-v1",
    programs: {} as Record<string, unknown>,
  };

  const programs = combinedIdls.programs as Record<string, unknown>;

  const exportedPrograms: Array<{
    name: string;
    version: string;
    idlSizeBytes: number;
    instructions: number;
    accounts: number;
    errors: number;
    typesCopied: boolean;
  }> = [];

  for (const idlFile of allIdlFiles) {
    const idlPath = path.join(IDL_DIR, idlFile);
    const programName = idlFile.replace(".json", "");
    const idlStat = fs.statSync(idlPath);

    let idl: Record<string, unknown>;
    try {
      idl = readJson(idlPath);
    } catch (err) {
      console.warn(`  WARNING: Could not parse ${idlFile}: ${err}`);
      continue;
    }

    const version = (idl.version as string | undefined) ?? "unknown";
    const instrCount = countIdlEntries(idl, "instructions");
    const accountCount = countIdlEntries(idl, "accounts");
    const errorCount = countIdlEntries(idl, "errors");

    programs[programName] = idl;

    console.log(`  ${programName}`);
    console.log(`    Version       : ${version}`);
    console.log(`    IDL size      : ${formatBytes(idlStat.size)}`);
    console.log(`    Instructions  : ${instrCount}`);
    console.log(`    Accounts      : ${accountCount}`);
    console.log(`    Errors        : ${errorCount}`);

    // ── Copy TypeScript types file if available ──────────────────────────────
    let typesCopied = false;
    const typesSourcePath = path.join(TYPES_DIR, `${programName}.ts`);
    const typesDestPath = path.join(SDK_DIR, `${programName}.generated.ts`);

    if (fs.existsSync(typesSourcePath)) {
      const typesContent = fs.readFileSync(typesSourcePath, "utf-8");
      const header = buildVersionHeader(programName, version);
      writeFile(typesDestPath, header + typesContent);
      const destStat = fs.statSync(typesDestPath);
      console.log(`    Types copied  : ${typesDestPath} (${formatBytes(destStat.size)})`);
      typesCopied = true;
    } else {
      console.log(`    Types         : not found at ${typesSourcePath} (skipped)`);
    }
    console.log("");

    exportedPrograms.push({
      name: programName,
      version,
      idlSizeBytes: idlStat.size,
      instructions: instrCount,
      accounts: accountCount,
      errors: errorCount,
      typesCopied,
    });
  }

  // ── Write combined IDLs.json ─────────────────────────────────────────────────
  const combinedPath = path.join(OUT_DIR, "IDLs.json");
  const combinedJson = JSON.stringify(combinedIdls, null, 2);
  writeFile(combinedPath, combinedJson);

  console.log(`Combined IDL manifest written to: ${combinedPath}`);
  console.log(`  Total size: ${formatBytes(Buffer.byteLength(combinedJson, "utf-8"))}`);
  console.log("");

  // ── Check for known programs that are missing IDLs ───────────────────────────
  const exportedNames = new Set(exportedPrograms.map((p) => p.name));
  const missingPrograms = KNOWN_PROGRAMS.filter((p) => !exportedNames.has(p));

  if (missingPrograms.length > 0) {
    console.warn("WARNING: The following known programs have no IDL file:");
    for (const m of missingPrograms) {
      console.warn(`  - ${m}`);
    }
    console.warn(
      "Run 'anchor build' to generate their IDLs.\n"
    );
  }

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log("Export Summary");
  console.log("─".repeat(60));
  const header = `${"Program".padEnd(30)} ${"Ver".padEnd(8)} ${"Instrs".padEnd(7)} ${"Accts".padEnd(6)} ${"Types"}`;
  console.log(header);
  console.log("─".repeat(60));

  for (const p of exportedPrograms) {
    const typesStatus = p.typesCopied ? "copied" : "missing";
    console.log(
      `${p.name.padEnd(30)} ${p.version.padEnd(8)} ${String(p.instructions).padEnd(7)} ${String(p.accounts).padEnd(6)} ${typesStatus}`
    );
  }
  console.log("─".repeat(60));
  console.log(
    `${String(exportedPrograms.length)} program(s) exported. ` +
    `${String(exportedPrograms.filter((p) => p.typesCopied).length)} TypeScript type file(s) copied.`
  );
  console.log("");
}

main().catch((err) => {
  console.error("Fatal error during IDL export:", err);
  process.exit(1);
});
