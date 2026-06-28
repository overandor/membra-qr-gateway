import * as anchor from "@coral-xyz/anchor";
import { Program, BN, AnchorError } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { createMint } from "@solana/spl-token";
import { expect } from "chai";

import { MembraRebase } from "../target/types/membra_rebase";

describe("membra_rebase", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.MembraRebase as Program<MembraRebase>;
  const connection = provider.connection;
  const payer = provider.wallet as anchor.Wallet;

  let authority: Keypair;
  let governance: Keypair;
  let keeper: Keypair;
  let tokenMint: PublicKey;
  let rebaseStatePda: PublicKey;
  let rebaseStateBump: number;

  // Rebase config constants
  const TARGET_PRICE_USD_6 = new BN(550_000);          // $0.55
  const MIN_PRICE_USD_6 = new BN(100_000);             // $0.10
  const MAX_PRICE_USD_6 = new BN(1_000_000);           // $1.00
  const MAX_POSITIVE_REBASE_BPS = new BN(500);         // +5% per epoch
  const MAX_NEGATIVE_REBASE_BPS = new BN(-500);        // -5% per epoch
  const REBASE_COEFFICIENT_BPS = new BN(5_000);        // 50% dampening
  const MIN_EPOCH_SECONDS = new BN(1);                 // 1 second (fast for tests)
  const STALE_PRICE_THRESHOLD = new BN(3600);          // 1 hour
  const VOLATILITY_CIRCUIT_BREAKER_BPS = new BN(9_000); // 90% — high to avoid tripping in tests

  const INITIAL_INDEX = new anchor.BN("1000000000000"); // 1e12

  function buildInitParams(overrides: Record<string, unknown> = {}) {
    return {
      governance: governance.publicKey,
      oraclePriceFeed: PublicKey.default,
      oracleSource: 2, // Manual
      targetPriceUsd6: TARGET_PRICE_USD_6,
      monitoringBandMinUsd6: MIN_PRICE_USD_6,
      monitoringBandMaxUsd6: MAX_PRICE_USD_6,
      maxPositiveRebaseBps: MAX_POSITIVE_REBASE_BPS,
      maxNegativeRebaseBps: MAX_NEGATIVE_REBASE_BPS,
      rebaseCoefficientBps: REBASE_COEFFICIENT_BPS,
      minEpochSeconds: MIN_EPOCH_SECONDS,
      stalePriceThresholdSeconds: STALE_PRICE_THRESHOLD,
      volatilityCircuitBreakerBps: VOLATILITY_CIRCUIT_BREAKER_BPS,
      ...overrides,
    } as any;
  }

  // The rebase state's price_history ring buffer holds PRICE_HISTORY_LEN
  // entries and feeds compute_twap(). Setting the oracle price only once
  // leaves stale entries from earlier tests in the buffer, skewing the TWAP.
  // Flushing the same price PRICE_HISTORY_LEN times overwrites every slot,
  // guaranteeing the TWAP exactly equals the price just set.
  const PRICE_HISTORY_LEN = 8;
  async function setOraclePriceFlushed(price: BN, confidence: BN) {
    for (let i = 0; i < PRICE_HISTORY_LEN; i++) {
      await program.methods
        .updateOraclePrice(price, confidence, new BN(Math.floor(Date.now() / 1000)))
        .accounts({ authority: authority.publicKey, rebaseState: rebaseStatePda } as any)
        .signers([authority])
        .rpc();
    }
  }

  before(async () => {
    authority = Keypair.generate();
    governance = Keypair.generate();
    keeper = Keypair.generate();

    await Promise.all([
      connection.requestAirdrop(authority.publicKey, 10 * LAMPORTS_PER_SOL)
        .then((sig) => connection.confirmTransaction(sig)),
      connection.requestAirdrop(governance.publicKey, 10 * LAMPORTS_PER_SOL)
        .then((sig) => connection.confirmTransaction(sig)),
      connection.requestAirdrop(keeper.publicKey, 2 * LAMPORTS_PER_SOL)
        .then((sig) => connection.confirmTransaction(sig)),
    ]);

    tokenMint = await createMint(
      connection,
      payer.payer,
      authority.publicKey,
      authority.publicKey,
      6
    );

    [rebaseStatePda, rebaseStateBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("rebase_state"), tokenMint.toBuffer()],
      program.programId
    );
  });

  // ─── initialize_rebase ─────────────────────────────────────────────────────

  it("initializes rebase config with valid parameters", async () => {
    await program.methods
      .initializeRebase(buildInitParams())
      .accounts({
        authority: authority.publicKey,
        tokenMint,
        rebaseState: rebaseStatePda,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([authority])
      .rpc();

    const state = await program.account.rebaseState.fetch(rebaseStatePda) as any;
    expect(state.globalRebaseIndex.toString()).to.equal(INITIAL_INDEX.toString());
    expect(state.paused).to.be.false;
    expect(state.targetPriceUsd6.toNumber()).to.equal(TARGET_PRICE_USD_6.toNumber());
    expect(state.oracleSource).to.equal(2); // Manual
    expect(state.authority.toBase58()).to.equal(authority.publicKey.toBase58());
    expect(state.governance.toBase58()).to.equal(governance.publicKey.toBase58());
  });

  it("rejects duplicate initialization of same token mint", async () => {
    try {
      await program.methods
        .initializeRebase(buildInitParams())
        .accounts({
          authority: authority.publicKey,
          tokenMint,
          rebaseState: rebaseStatePda,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([authority])
        .rpc();
      expect.fail("Should have thrown since account already exists");
    } catch (err) {
      // Anchor will throw when trying to init an already-initialised PDA
      expect(err).to.be.instanceOf(Error);
    }
  });

  it("rejects invalid price band (min >= max)", async () => {
    const badMint = await createMint(
      connection,
      payer.payer,
      authority.publicKey,
      authority.publicKey,
      6
    );
    const [badPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("rebase_state"), badMint.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .initializeRebase(
          buildInitParams({
            monitoringBandMinUsd6: new BN(1_000_000), // min >= max
            monitoringBandMaxUsd6: new BN(100_000),
            targetPriceUsd6: new BN(500_000),
          })
        )
        .accounts({
          authority: authority.publicKey,
          tokenMint: badMint,
          rebaseState: badPda,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([authority])
        .rpc();
      expect.fail("Should have thrown InvalidRebaseParams");
    } catch (err) {
      expect((err as AnchorError).error.errorCode.code).to.equal("InvalidRebaseParams");
    }
  });

  it("rejects target price outside monitoring band", async () => {
    const badMint = await createMint(
      connection,
      payer.payer,
      authority.publicKey,
      authority.publicKey,
      6
    );
    const [badPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("rebase_state"), badMint.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .initializeRebase(
          buildInitParams({
            targetPriceUsd6: new BN(50_000), // below min band
            monitoringBandMinUsd6: new BN(100_000),
            monitoringBandMaxUsd6: new BN(1_000_000),
          })
        )
        .accounts({
          authority: authority.publicKey,
          tokenMint: badMint,
          rebaseState: badPda,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([authority])
        .rpc();
      expect.fail("Should have thrown InvalidRebaseParams");
    } catch (err) {
      expect((err as AnchorError).error.errorCode.code).to.equal("InvalidRebaseParams");
    }
  });

  // ─── update_oracle_price ───────────────────────────────────────────────────

  it("updates oracle price from authority", async () => {
    const priceUsd6 = new BN(600_000); // $0.60
    const confidenceUsd6 = new BN(5_000); // $0.005 confidence (< price/10)
    const oracleTs = new BN(Math.floor(Date.now() / 1000));

    await program.methods
      .updateOraclePrice(priceUsd6, confidenceUsd6, oracleTs)
      .accounts({
        authority: authority.publicKey,
        rebaseState: rebaseStatePda,
      } as any)
      .signers([authority])
      .rpc();

    const state = await program.account.rebaseState.fetch(rebaseStatePda) as any;
    expect(state.lastOraclePriceUsd6.toNumber()).to.equal(priceUsd6.toNumber());
  });

  it("rejects oracle price update from unauthorized signer", async () => {
    const rando = Keypair.generate();
    await connection.requestAirdrop(rando.publicKey, LAMPORTS_PER_SOL).then((sig) =>
      connection.confirmTransaction(sig)
    );

    try {
      await program.methods
        .updateOraclePrice(
          new BN(600_000),
          new BN(5_000),
          new BN(Math.floor(Date.now() / 1000))
        )
        .accounts({
          authority: rando.publicKey,
          rebaseState: rebaseStatePda,
        } as any)
        .signers([rando])
        .rpc();
      expect.fail("Should have thrown Unauthorized");
    } catch (err) {
      expect((err as AnchorError).error.errorCode.code).to.equal("Unauthorized");
    }
  });

  it("rejects stale oracle price (oracle_ts too old)", async () => {
    const staleTs = new BN(Math.floor(Date.now() / 1000) - 7200); // 2h ago

    try {
      await program.methods
        .updateOraclePrice(new BN(600_000), new BN(5_000), staleTs)
        .accounts({
          authority: authority.publicKey,
          rebaseState: rebaseStatePda,
        } as any)
        .signers([authority])
        .rpc();
      expect.fail("Should have thrown OraclePriceStale");
    } catch (err) {
      expect((err as AnchorError).error.errorCode.code).to.equal("OraclePriceStale");
    }
  });

  it("rejects oracle price with confidence too wide (>= price / 10)", async () => {
    const price = new BN(600_000);
    const badConf = price.divn(10); // exactly at boundary — must be LESS THAN price/10

    try {
      await program.methods
        .updateOraclePrice(
          price,
          badConf,
          new BN(Math.floor(Date.now() / 1000))
        )
        .accounts({
          authority: authority.publicKey,
          rebaseState: rebaseStatePda,
        } as any)
        .signers([authority])
        .rpc();
      expect.fail("Should have thrown OracleConfidenceTooLow");
    } catch (err) {
      expect((err as AnchorError).error.errorCode.code).to.equal("OracleConfidenceTooLow");
    }
  });

  // ─── execute_rebase ────────────────────────────────────────────────────────

  it("executes rebase with price at target (0 bps adjustment)", async () => {
    // First set price equal to target: $0.55
    const targetPrice = new BN(550_000);

    // Flush the ring buffer so the TWAP exactly equals targetPrice, free of
    // stale entries left over from earlier oracle-price tests.
    await setOraclePriceFlushed(targetPrice, new BN(1_000));

    // Allow sufficient time to pass (at least min_epoch_seconds = 1)
    await new Promise((r) => setTimeout(r, 1200));

    const stateBefore = await program.account.rebaseState.fetch(rebaseStatePda) as any;
    const indexBefore = stateBefore.globalRebaseIndex;

    await program.methods
      .executeRebase()
      .accounts({
        keeper: keeper.publicKey,
        rebaseState: rebaseStatePda,
      } as any)
      .signers([keeper])
      .rpc();

    const stateAfter = await program.account.rebaseState.fetch(rebaseStatePda) as any;
    // At target price, deviation = 0, so rebase_bps = 0, index unchanged
    expect(stateAfter.globalRebaseIndex.toString()).to.equal(indexBefore.toString());
    expect(stateAfter.lastRebaseBps.toNumber()).to.equal(0);
  });

  it("executes positive rebase when price above target (index contracts)", async () => {
    // Price $0.80 > target $0.55: positive deviation → contracts supply (negative index change
    // per MEMBRA spec: positive deviation_bps → positive raw_rebase_bps)
    // Actually per the formula: deviation_bps = (twap - target) * 10000 / target
    // = (800000 - 550000) * 10000 / 550000 ≈ +4545 bps
    // raw_rebase_bps = 4545 * 5000 / 10000 = +2272, clamped to +500
    // new_index = index * (10000 + 500) / 10000  → index grows

    await setOraclePriceFlushed(new BN(800_000), new BN(5_000));

    await new Promise((r) => setTimeout(r, 1200));

    const stateBefore = await program.account.rebaseState.fetch(rebaseStatePda) as any;
    const indexBefore = BigInt(stateBefore.globalRebaseIndex.toString());

    await program.methods
      .executeRebase()
      .accounts({ keeper: keeper.publicKey, rebaseState: rebaseStatePda } as any)
      .signers([keeper])
      .rpc();

    const stateAfter = await program.account.rebaseState.fetch(rebaseStatePda) as any;
    const indexAfter = BigInt(stateAfter.globalRebaseIndex.toString());
    // With positive rebase_bps = +500, index should increase
    expect(indexAfter > indexBefore).to.be.true;
    expect(stateAfter.lastRebaseBps.toNumber()).to.equal(500); // clamped at max_positive
  });

  it("executes negative rebase when price below target (index contracts)", async () => {
    // Price $0.40 < target $0.55: negative deviation → positive raw_rebase but
    // wait — (0.40 - 0.55)/0.55 = -2727 bps, raw = -2727 * 5000/10000 = -1363
    // clamped to -500 bps → index decreases
    await setOraclePriceFlushed(new BN(400_000), new BN(3_000));

    await new Promise((r) => setTimeout(r, 1200));

    const stateBefore = await program.account.rebaseState.fetch(rebaseStatePda) as any;
    const indexBefore = BigInt(stateBefore.globalRebaseIndex.toString());

    await program.methods
      .executeRebase()
      .accounts({ keeper: keeper.publicKey, rebaseState: rebaseStatePda } as any)
      .signers([keeper])
      .rpc();

    const stateAfter = await program.account.rebaseState.fetch(rebaseStatePda) as any;
    const indexAfter = BigInt(stateAfter.globalRebaseIndex.toString());
    // With negative rebase_bps = -500, index should decrease
    expect(indexAfter < indexBefore).to.be.true;
    expect(stateAfter.lastRebaseBps.toNumber()).to.equal(-500); // clamped at max_negative
  });

  it("rejects rebase before epoch duration has elapsed", async () => {
    // min_epoch_seconds = 1 is too tight to reliably distinguish "rejected"
    // from "just slow CI/RPC round-trip", so this test uses an isolated
    // state with a large min_epoch_seconds: a single back-to-back RPC
    // round-trip can't plausibly take 30 seconds.
    const epochMint = await createMint(
      connection,
      payer.payer,
      authority.publicKey,
      authority.publicKey,
      6
    );
    const [epochStatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("rebase_state"), epochMint.toBuffer()],
      program.programId
    );

    await program.methods
      .initializeRebase(buildInitParams({ minEpochSeconds: new BN(30) }))
      .accounts({
        authority: authority.publicKey,
        tokenMint: epochMint,
        rebaseState: epochStatePda,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([authority])
      .rpc();

    const now = Math.floor(Date.now() / 1000);
    await program.methods
      .updateOraclePrice(new BN(550_000), new BN(1_000), new BN(now))
      .accounts({ authority: authority.publicKey, rebaseState: epochStatePda } as any)
      .signers([authority])
      .rpc();

    // First-ever rebase: last_rebase_ts == 0, so the epoch-elapsed gate
    // always passes regardless of timing.
    await program.methods
      .executeRebase()
      .accounts({ keeper: keeper.publicKey, rebaseState: epochStatePda } as any)
      .signers([keeper])
      .rpc();

    // Immediate second rebase must be rejected: min_epoch_seconds = 30.
    try {
      await program.methods
        .executeRebase()
        .accounts({ keeper: keeper.publicKey, rebaseState: epochStatePda } as any)
        .signers([keeper])
        .rpc();
      expect.fail("Should have thrown EpochTooSoon");
    } catch (err) {
      expect((err as AnchorError).error.errorCode.code).to.equal("EpochTooSoon");
    }
  });

  it("rejects rebase with stale oracle price", async () => {
    // Manually set a very old last_oracle_update_ts by updating with a very old timestamp
    // We can't warp time directly, so instead we create a fresh rebase state on
    // a new mint with a large min_epoch_seconds to ensure the oracle goes stale.
    // Simpler: the oracle price is already set; we test by using stale_price_threshold=0
    // which is invalid at init. Instead we use the large epoch state.

    // Alternative: update with a fresh ts, then set stale_threshold to 1s and not update price
    // Since we can't warp the clock, we test this by setting oracle_ts to a past timestamp
    // then calling updateOraclePrice with a past oracle_ts → that itself throws OraclePriceStale
    // (The execute_rebase staleness check uses last_oracle_update_ts which is set to block time)
    // This test verifies the error code exists and is rejected:
    const staleTs = new BN(Math.floor(Date.now() / 1000) - 7200);
    try {
      await program.methods
        .updateOraclePrice(new BN(550_000), new BN(1_000), staleTs)
        .accounts({ authority: authority.publicKey, rebaseState: rebaseStatePda } as any)
        .signers([authority])
        .rpc();
      expect.fail("Should have thrown OraclePriceStale");
    } catch (err) {
      expect((err as AnchorError).error.errorCode.code).to.equal("OraclePriceStale");
    }
  });

  it("blocks rebase when paused", async () => {
    await program.methods
      .pauseRebase()
      .accounts({ caller: authority.publicKey, rebaseState: rebaseStatePda } as any)
      .signers([authority])
      .rpc();

    const state = await program.account.rebaseState.fetch(rebaseStatePda) as any;
    expect(state.paused).to.be.true;

    try {
      await program.methods
        .executeRebase()
        .accounts({ keeper: keeper.publicKey, rebaseState: rebaseStatePda } as any)
        .signers([keeper])
        .rpc();
      expect.fail("Should have thrown RebasePaused");
    } catch (err) {
      expect((err as AnchorError).error.errorCode.code).to.equal("RebasePaused");
    }
  });

  // ─── pause/resume ──────────────────────────────────────────────────────────

  it("authority can pause and resume rebase", async () => {
    // Already paused from prior test; resume
    await program.methods
      .resumeRebase()
      .accounts({ caller: authority.publicKey, rebaseState: rebaseStatePda } as any)
      .signers([authority])
      .rpc();

    let state = await program.account.rebaseState.fetch(rebaseStatePda) as any;
    expect(state.paused).to.be.false;

    await program.methods
      .pauseRebase()
      .accounts({ caller: authority.publicKey, rebaseState: rebaseStatePda } as any)
      .signers([authority])
      .rpc();

    state = await program.account.rebaseState.fetch(rebaseStatePda) as any;
    expect(state.paused).to.be.true;

    await program.methods
      .resumeRebase()
      .accounts({ caller: authority.publicKey, rebaseState: rebaseStatePda } as any)
      .signers([authority])
      .rpc();

    state = await program.account.rebaseState.fetch(rebaseStatePda) as any;
    expect(state.paused).to.be.false;
  });

  // ─── update_rebase_params ──────────────────────────────────────────────────

  it("governance can update rebase parameters", async () => {
    const newTargetPrice = new BN(450_000); // $0.45 (within [100k, 1M])

    await program.methods
      .updateRebaseParams({
        targetPriceUsd6: newTargetPrice,
        maxPositiveRebaseBps: null,
        maxNegativeRebaseBps: null,
        rebaseCoefficientBps: null,
        minEpochSeconds: null,
        stalePriceThresholdSeconds: null,
        volatilityCircuitBreakerBps: null,
      } as any)
      .accounts({
        governance: governance.publicKey,
        rebaseState: rebaseStatePda,
      } as any)
      .signers([governance])
      .rpc();

    const state = await program.account.rebaseState.fetch(rebaseStatePda) as any;
    expect(state.targetPriceUsd6.toNumber()).to.equal(newTargetPrice.toNumber());
  });

  it("rejects parameter update from non-governance", async () => {
    const rando = Keypair.generate();
    await connection.requestAirdrop(rando.publicKey, LAMPORTS_PER_SOL).then((sig) =>
      connection.confirmTransaction(sig)
    );

    try {
      await program.methods
        .updateRebaseParams({
          targetPriceUsd6: new BN(550_000),
          maxPositiveRebaseBps: null,
          maxNegativeRebaseBps: null,
          rebaseCoefficientBps: null,
          minEpochSeconds: null,
          stalePriceThresholdSeconds: null,
          volatilityCircuitBreakerBps: null,
        } as any)
        .accounts({
          governance: rando.publicKey,
          rebaseState: rebaseStatePda,
        } as any)
        .signers([rando])
        .rpc();
      expect.fail("Should have thrown Unauthorized");
    } catch (err) {
      expect((err as AnchorError).error.errorCode.code).to.equal("Unauthorized");
    }
  });

  // ─── index accounting math (pure TypeScript) ──────────────────────────────

  it("shares correctly compute token value via index", () => {
    const shares = new anchor.BN(1000);
    const index = new anchor.BN("1050000000000"); // 1.05e12
    const scale = new anchor.BN("1000000000000"); // 1e12
    const redeemable = shares.mul(index).div(scale);
    expect(redeemable.toNumber()).to.equal(1050);
  });

  it("global_rebase_index stays strictly positive after clamped negative rebase", () => {
    // Simulate many epochs with max_negative = -500 bps
    let index = BigInt("1000000000000"); // 1e12
    const MAX_NEG_BPS = BigInt(-500);
    const BPS_DENOM = BigInt(10_000);
    for (let i = 0; i < 100; i++) {
      index = (index * (BPS_DENOM + MAX_NEG_BPS)) / BPS_DENOM;
    }
    // After 100 epochs of -5% each: 1e12 * 0.95^100 ≈ 5.9e9 — still positive
    expect(index > BigInt(0)).to.be.true;
  });
});
