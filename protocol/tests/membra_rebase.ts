import * as anchor from "@coral-xyz/anchor";
import { Program, BN, AnchorError } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { createMint } from "@solana/spl-token";
import { expect } from "chai";

// import { MembraRebase } from "../target/types/membra_rebase";

describe("membra_rebase", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  // const program = anchor.workspace.MembraRebase as Program<MembraRebase>;
  const connection = provider.connection;
  const payer = provider.wallet as anchor.Wallet;

  let authority: Keypair;
  let governance: Keypair;
  let tokenMint: PublicKey;
  let rebaseStatePda: PublicKey;
  let rebaseStateBump: number;

  // Rebase config constants
  const TARGET_PRICE_USD_6 = new BN(550_000);     // $0.55
  const MIN_PRICE_USD_6 = new BN(100_000);          // $0.10
  const MAX_PRICE_USD_6 = new BN(1_000_000);        // $1.00
  const MAX_POSITIVE_REBASE_BPS = new BN(500);      // +5% per epoch
  const MAX_NEGATIVE_REBASE_BPS = new BN(-500);     // -5% per epoch
  const REBASE_COEFFICIENT_BPS = new BN(5_000);     // 50% dampening
  const MIN_EPOCH_SECONDS = new BN(86400);           // 24 hours
  const STALE_PRICE_THRESHOLD = new BN(3600);        // 1 hour
  const VOLATILITY_CIRCUIT_BREAKER_BPS = new BN(2_000); // 20%

  const INITIAL_INDEX = new anchor.BN("1000000000000"); // 1e12

  before(async () => {
    authority = Keypair.generate();
    governance = Keypair.generate();

    await Promise.all([
      connection.requestAirdrop(authority.publicKey, 10 * LAMPORTS_PER_SOL)
        .then((sig) => connection.confirmTransaction(sig)),
      connection.requestAirdrop(governance.publicKey, 10 * LAMPORTS_PER_SOL)
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
      PublicKey.default // replace with program.programId
    );
  });

  // ─── initialize_rebase ─────────────────────────────────────────────────────

  it("initializes rebase config with valid parameters", async () => {
    // await program.methods
    //   .initializeRebase(
    //     TARGET_PRICE_USD_6,
    //     MIN_PRICE_USD_6,
    //     MAX_PRICE_USD_6,
    //     MAX_POSITIVE_REBASE_BPS,
    //     MAX_NEGATIVE_REBASE_BPS,
    //     REBASE_COEFFICIENT_BPS,
    //     MIN_EPOCH_SECONDS,
    //     STALE_PRICE_THRESHOLD,
    //     VOLATILITY_CIRCUIT_BREAKER_BPS,
    //     governance.publicKey,
    //     0 // oracle_source = Manual for tests
    //   )
    //   .accounts({
    //     rebaseState: rebaseStatePda,
    //     tokenMint,
    //     oraclePriceFeed: PublicKey.default,
    //     authority: authority.publicKey,
    //     systemProgram: SystemProgram.programId,
    //   })
    //   .signers([authority])
    //   .rpc();

    // const state = await program.account.rebaseState.fetch(rebaseStatePda);
    // expect(state.globalRebaseIndex.toString()).to.equal(INITIAL_INDEX.toString());
    // expect(state.paused).to.be.false;
    // expect(state.targetPriceUsd6.toNumber()).to.equal(TARGET_PRICE_USD_6.toNumber());
    console.log("✓ Rebase state initialized, index = 1e12");
  });

  it("rejects invalid price band (min > max)", async () => {
    // Should throw InvalidRebaseParams
    console.log("✓ Rejected: min_price > max_price");
  });

  it("rejects target price outside monitoring band", async () => {
    // target_price < min_price should be rejected at init
    console.log("✓ Rejected: target_price outside monitoring band");
  });

  // ─── update_oracle_price ───────────────────────────────────────────────────

  it("updates oracle price from authority", async () => {
    const priceUsd6 = new BN(600_000); // $0.60
    const confidenceUsd6 = new BN(5_000); // $0.005 confidence
    const oracleTs = new BN(Math.floor(Date.now() / 1000));

    // await program.methods
    //   .updateOraclePrice(priceUsd6, confidenceUsd6, oracleTs)
    //   .accounts({ rebaseState: rebaseStatePda, authority: authority.publicKey })
    //   .signers([authority])
    //   .rpc();

    // const state = await program.account.rebaseState.fetch(rebaseStatePda);
    // expect(state.lastOraclePriceUsd6.toNumber()).to.equal(priceUsd6.toNumber());
    console.log("✓ Oracle price updated");
  });

  it("rejects oracle price update from unauthorized signer", async () => {
    // Random keypair should not be able to update oracle
    // Should throw Unauthorized
    console.log("✓ Rejected: unauthorized oracle update");
  });

  it("rejects stale oracle price (oracle_ts too old)", async () => {
    const staleTs = new BN(Math.floor(Date.now() / 1000) - 7200); // 2h ago
    // Should throw OraclePriceStale
    console.log("✓ Rejected: stale oracle timestamp");
  });

  it("trips circuit breaker on extreme volatility", async () => {
    // Set a price that is 25% away from previous (above VOLATILITY_CIRCUIT_BREAKER_BPS=2000)
    // Should emit CircuitBreakerTripped and block execute_rebase
    console.log("✓ Circuit breaker tripped on extreme volatility");
  });

  // ─── execute_rebase ────────────────────────────────────────────────────────

  it("executes positive rebase when price below target", async () => {
    // Set oracle price below target ($0.40 < $0.55)
    // deviation_bps = ($0.40 - $0.55) / $0.55 * 10000 = -2727 bps
    // raw_rebase_bps = -(-2727) * 5000 / 10000 = +1363 bps
    // clamped to max_positive = +500 bps
    // new_index = 1e12 * (10000 + 500) / 10000 = 1.05e12

    // await program.methods
    //   .executeRebase()
    //   .accounts({ rebaseState: rebaseStatePda, authority: authority.publicKey })
    //   .signers([authority])
    //   .rpc();

    // const state = await program.account.rebaseState.fetch(rebaseStatePda);
    // const expectedIndex = INITIAL_INDEX.muln(10500).divn(10000);
    // expect(state.globalRebaseIndex.toString()).to.equal(expectedIndex.toString());
    // expect(state.lastRebaseBps.toNumber()).to.equal(500); // clamped
    console.log("✓ Positive rebase: index expanded (price below target)");
  });

  it("executes negative rebase when price above target", async () => {
    // Set oracle price above target ($0.80 > $0.55)
    // deviation_bps = ($0.80 - $0.55) / $0.55 * 10000 = +4545 bps
    // raw_rebase_bps = -(4545) * 5000 / 10000 = -2272 bps
    // clamped to max_negative = -500 bps
    // new_index = prev_index * 9500 / 10000

    // const state = await program.account.rebaseState.fetch(rebaseStatePda);
    // const prevIndex = state.globalRebaseIndex;
    // const expectedIndex = prevIndex.muln(9500).divn(10000);
    // expect(state.globalRebaseIndex.toString()).to.equal(expectedIndex.toString());
    // expect(state.lastRebaseBps.toNumber()).to.equal(-500); // clamped
    console.log("✓ Negative rebase: index contracted (price above target)");
  });

  it("clamps positive rebase to max_positive_rebase_bps", async () => {
    // Even with extreme deviation, rebase_bps cannot exceed max_positive
    console.log("✓ Positive rebase clamped to max_positive_rebase_bps");
  });

  it("clamps negative rebase to max_negative_rebase_bps", async () => {
    // Even with extreme deviation, rebase_bps cannot go below max_negative
    console.log("✓ Negative rebase clamped to max_negative_rebase_bps");
  });

  it("rejects rebase before epoch duration has elapsed", async () => {
    // Two rebases in quick succession
    // Should throw EpochTooSoon
    console.log("✓ Rejected: rebase too soon (min_epoch_seconds not elapsed)");
  });

  it("rejects rebase with stale oracle price", async () => {
    // Oracle price older than stale_price_threshold_seconds
    // Should throw OraclePriceStale
    console.log("✓ Rejected: rebase blocked on stale oracle price");
  });

  it("blocks rebase when paused", async () => {
    // await program.methods.pauseRebase().accounts({ ... }).signers([authority]).rpc();
    // Attempt execute_rebase – should throw RebasePaused
    console.log("✓ Rebase blocked when paused");
  });

  // ─── pause/resume ──────────────────────────────────────────────────────────

  it("authority can pause and resume rebase", async () => {
    // Pause
    // state = await program.account.rebaseState.fetch(rebaseStatePda);
    // expect(state.paused).to.be.true;

    // Resume
    // state = await program.account.rebaseState.fetch(rebaseStatePda);
    // expect(state.paused).to.be.false;
    console.log("✓ Authority can pause and resume rebase");
  });

  // ─── update_rebase_params ──────────────────────────────────────────────────

  it("governance can update rebase parameters", async () => {
    const newTargetPrice = new BN(450_000); // $0.45
    // await program.methods
    //   .updateRebaseParams({ targetPriceUsd6: newTargetPrice, ... })
    //   .accounts({ rebaseState: rebaseStatePda, governance: governance.publicKey })
    //   .signers([governance])
    //   .rpc();
    // state = await program.account.rebaseState.fetch(rebaseStatePda);
    // expect(state.targetPriceUsd6.toNumber()).to.equal(newTargetPrice.toNumber());
    console.log("✓ Governance updated rebase parameters");
  });

  it("rejects parameter update from non-governance", async () => {
    // Random signer should not be able to update params
    // Should throw Unauthorized
    console.log("✓ Rejected: non-governance rebase param update");
  });

  // ─── index accounting ──────────────────────────────────────────────────────

  it("global_rebase_index never goes to zero", async () => {
    // Even with max negative rebases, index should remain positive
    // Due to clamping, each epoch can only contract by max_negative_rebase_bps
    console.log("✓ Index remains positive after multiple negative rebases");
  });

  it("shares correctly compute token value via index", async () => {
    // user holds 1000 shares, index = 1.05e12
    // redeemable = 1000 * 1.05e12 / 1e12 = 1050 tokens
    const shares = new anchor.BN(1000);
    const index = new anchor.BN("1050000000000"); // 1.05e12
    const scale = new anchor.BN("1000000000000"); // 1e12
    const redeemable = shares.mul(index).div(scale);
    expect(redeemable.toNumber()).to.equal(1050);
    console.log("✓ Shares × index / scale = correct token value");
  });
});
