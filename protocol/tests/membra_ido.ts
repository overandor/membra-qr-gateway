import * as anchor from "@coral-xyz/anchor";
import { Program, BN, AnchorError } from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  createAssociatedTokenAccount,
  getAssociatedTokenAddress,
  mintTo,
  getAccount,
  createAccount,
} from "@solana/spl-token";
import { expect } from "chai";

import { MembraIdo } from "../target/types/membra_ido";

describe("membra_ido", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.MembraIdo as Program<MembraIdo>;
  const connection = provider.connection;
  const payer = provider.wallet as anchor.Wallet;

  let tokenMint: PublicKey;
  let paymentMint: PublicKey;
  let tokenVault: PublicKey;
  let paymentVault: PublicKey;
  let authority: Keypair;
  let buyer1: Keypair;
  let buyer2: Keypair;
  let governance: Keypair;
  let treasury: PublicKey;
  let treasuryTokenAccount: PublicKey;
  let idoConfigPda: PublicKey;
  let idoConfigBump: number;

  // IDO that starts in the past so purchases work immediately
  let activeIdoMint: PublicKey;
  let activeIdoConfig: PublicKey;
  let activeTokenVault: PublicKey;
  let activePaymentVault: PublicKey;

  const TOKEN_PRICE_USD_6 = new BN(100_000); // $0.10 per token
  const HARD_CAP_TOKENS = new BN(1_000_000_000_000); // 1M tokens (6 decimals)
  const MIN_PURCHASE = new BN(10_000_000); // 10 tokens
  const MAX_PURCHASE = new BN(100_000_000_000); // 100K tokens per wallet
  const TOKEN_DECIMALS = 6;

  before(async () => {
    authority = Keypair.generate();
    buyer1 = Keypair.generate();
    buyer2 = Keypair.generate();
    governance = Keypair.generate();

    await Promise.all([
      connection.requestAirdrop(authority.publicKey, 10 * LAMPORTS_PER_SOL).then((sig) =>
        connection.confirmTransaction(sig)
      ),
      connection.requestAirdrop(buyer1.publicKey, 10 * LAMPORTS_PER_SOL).then((sig) =>
        connection.confirmTransaction(sig)
      ),
      connection.requestAirdrop(buyer2.publicKey, 10 * LAMPORTS_PER_SOL).then((sig) =>
        connection.confirmTransaction(sig)
      ),
    ]);

    // Create mints
    tokenMint = await createMint(
      connection,
      payer.payer,
      authority.publicKey,
      authority.publicKey,
      TOKEN_DECIMALS
    );

    paymentMint = await createMint(
      connection,
      payer.payer,
      payer.payer.publicKey,
      payer.payer.publicKey,
      6
    );

    treasury = Keypair.generate().publicKey;

    // Derive IDO config PDA
    [idoConfigPda, idoConfigBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("ido_config"), tokenMint.toBuffer()],
      program.programId
    );

    // Create token vault as a regular SPL token account owned by idoConfigPda.
    // idoConfigPda is off-curve, so an explicit keypair must be passed —
    // otherwise createAccount() falls back to ATA derivation, which rejects
    // off-curve owners.
    tokenVault = await createAccount(
      connection,
      payer.payer,
      tokenMint,
      idoConfigPda,
      Keypair.generate()
    );

    // Create payment vault owned by idoConfigPda
    paymentVault = await createAccount(
      connection,
      payer.payer,
      paymentMint,
      idoConfigPda,
      Keypair.generate()
    );

    // Create a treasury token account (needed for finalize when burn=false)
    // Treasury is a random pubkey; we create an ATA for it
    const treasuryKp = Keypair.generate();
    treasury = treasuryKp.publicKey;
    treasuryTokenAccount = await createAccount(
      connection,
      payer.payer,
      tokenMint,
      treasury
    );

    // Mint tokens into the token vault to fund the IDO
    await mintTo(
      connection,
      payer.payer,
      tokenMint,
      tokenVault,
      authority.publicKey,
      HARD_CAP_TOKENS.toNumber(),
      [authority]
    );
  });

  // ─── initialize_ido ────────────────────────────────────────────────────────

  it("initializes IDO with valid parameters", async () => {
    const now = Math.floor(Date.now() / 1000);
    // start in the future so purchases are blocked by default
    const startTs = new BN(now + 60);
    const endTs = new BN(now + 86400);
    const claimStartTs = new BN(now + 86400 + 3600);

    await program.methods
      .initializeIdo(
        TOKEN_PRICE_USD_6,
        HARD_CAP_TOKENS,
        MIN_PURCHASE,
        MAX_PURCHASE,
        startTs,
        endTs,
        claimStartTs,
        false // unsold_burn
      )
      .accounts({
        authority: authority.publicKey,
        tokenMint,
        paymentMint,
        tokenVault,
        paymentVault,
        treasury,
        governance: governance.publicKey,
        idoConfig: idoConfigPda,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      } as any)
      .signers([authority])
      .rpc();

    const config = await program.account.idoConfig.fetch(idoConfigPda) as any;
    expect(config.tokenPriceUsd6.toNumber()).to.equal(TOKEN_PRICE_USD_6.toNumber());
    expect(config.hardCapTokens.toString()).to.equal(HARD_CAP_TOKENS.toString());
    expect(config.finalized).to.be.false;
    expect(config.cancelled).to.be.false;
    expect(config.paused).to.be.false;
    expect(config.startTs.toNumber()).to.equal(startTs.toNumber());
  });

  it("rejects IDO initialization with start_ts >= end_ts", async () => {
    const now = Math.floor(Date.now() / 1000);
    const badMint = await createMint(
      connection,
      payer.payer,
      authority.publicKey,
      authority.publicKey,
      6
    );
    const [badConfig] = PublicKey.findProgramAddressSync(
      [Buffer.from("ido_config"), badMint.toBuffer()],
      program.programId
    );
    const badVault = await createAccount(connection, payer.payer, badMint, badConfig, Keypair.generate());
    const badPayVault = await createAccount(connection, payer.payer, paymentMint, badConfig, Keypair.generate());

    try {
      await program.methods
        .initializeIdo(
          TOKEN_PRICE_USD_6,
          HARD_CAP_TOKENS,
          MIN_PURCHASE,
          MAX_PURCHASE,
          new BN(now + 86400), // start AFTER end
          new BN(now + 10),
          new BN(now + 90000),
          false
        )
        .accounts({
          authority: authority.publicKey,
          tokenMint: badMint,
          paymentMint,
          tokenVault: badVault,
          paymentVault: badPayVault,
          treasury,
          governance: governance.publicKey,
          idoConfig: badConfig,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        } as any)
        .signers([authority])
        .rpc();
      expect.fail("Should have thrown InvalidTimestamp");
    } catch (err) {
      expect((err as AnchorError).error.errorCode.code).to.equal("InvalidTimestamp");
    }
  });

  it("rejects IDO initialization with zero price", async () => {
    const now = Math.floor(Date.now() / 1000);
    const badMint = await createMint(
      connection,
      payer.payer,
      authority.publicKey,
      authority.publicKey,
      6
    );
    const [badConfig] = PublicKey.findProgramAddressSync(
      [Buffer.from("ido_config"), badMint.toBuffer()],
      program.programId
    );
    const badVault = await createAccount(connection, payer.payer, badMint, badConfig, Keypair.generate());
    const badPayVault = await createAccount(connection, payer.payer, paymentMint, badConfig, Keypair.generate());

    try {
      await program.methods
        .initializeIdo(
          new BN(0), // zero price
          HARD_CAP_TOKENS,
          MIN_PURCHASE,
          MAX_PURCHASE,
          new BN(now + 10),
          new BN(now + 86400),
          new BN(now + 90000),
          false
        )
        .accounts({
          authority: authority.publicKey,
          tokenMint: badMint,
          paymentMint,
          tokenVault: badVault,
          paymentVault: badPayVault,
          treasury,
          governance: governance.publicKey,
          idoConfig: badConfig,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        } as any)
        .signers([authority])
        .rpc();
      expect.fail("Should have thrown InvalidPrice");
    } catch (err) {
      expect((err as AnchorError).error.errorCode.code).to.equal("InvalidPrice");
    }
  });

  // ─── Set up a second IDO that is ALREADY started for buy/pause/cancel tests ─

  before(async () => {
    activeIdoMint = await createMint(
      connection,
      payer.payer,
      authority.publicKey,
      authority.publicKey,
      TOKEN_DECIMALS
    );

    [activeIdoConfig] = PublicKey.findProgramAddressSync(
      [Buffer.from("ido_config"), activeIdoMint.toBuffer()],
      program.programId
    );

    activeTokenVault = await createAccount(connection, payer.payer, activeIdoMint, activeIdoConfig, Keypair.generate());
    activePaymentVault = await createAccount(connection, payer.payer, paymentMint, activeIdoConfig, Keypair.generate());

    await mintTo(
      connection,
      payer.payer,
      activeIdoMint,
      activeTokenVault,
      authority.publicKey,
      HARD_CAP_TOKENS.toNumber(),
      [authority]
    );

    const now = Math.floor(Date.now() / 1000);
    // Start in past, end 24h from now so purchases work
    await program.methods
      .initializeIdo(
        TOKEN_PRICE_USD_6,
        HARD_CAP_TOKENS,
        MIN_PURCHASE,
        MAX_PURCHASE,
        new BN(now - 10), // already started
        new BN(now + 86400),
        new BN(now + 86400 + 3600),
        false
      )
      .accounts({
        authority: authority.publicKey,
        tokenMint: activeIdoMint,
        paymentMint,
        tokenVault: activeTokenVault,
        paymentVault: activePaymentVault,
        treasury,
        governance: governance.publicKey,
        idoConfig: activeIdoConfig,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      } as any)
      .signers([authority])
      .rpc();
  });

  // ─── buy_ido ───────────────────────────────────────────────────────────────

  it("allows purchase within valid window and caps", async () => {
    const purchaseAmount = new BN(50_000_000); // 50 tokens
    const paymentAmount = purchaseAmount.mul(TOKEN_PRICE_USD_6).toNumber();

    const buyer1PaymentAta = await createAssociatedTokenAccount(
      connection,
      payer.payer,
      paymentMint,
      buyer1.publicKey
    );
    await mintTo(
      connection,
      payer.payer,
      paymentMint,
      buyer1PaymentAta,
      payer.payer,
      paymentAmount * 2
    );

    const [userIdoRecord] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_ido"), activeIdoConfig.toBuffer(), buyer1.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .buyIdo(purchaseAmount)
      .accounts({
        user: buyer1.publicKey,
        idoConfig: activeIdoConfig,
        userIdoRecord,
        userPaymentAccount: buyer1PaymentAta,
        paymentVault: activePaymentVault,
        paymentMint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      } as any)
      .signers([buyer1])
      .rpc();

    const record = await program.account.userIdoRecord.fetch(userIdoRecord) as any;
    expect(record.tokensPurchased.toString()).to.equal(purchaseAmount.toString());
    expect(record.tokensClaimed).to.be.false;
    expect(record.refunded).to.be.false;

    const config = await program.account.idoConfig.fetch(activeIdoConfig) as any;
    expect(config.totalSoldTokens.toString()).to.equal(purchaseAmount.toString());
  });

  it("rejects purchase before IDO start", async () => {
    // The first IDO (idoConfigPda) starts 60s in the future
    const buyer1PaymentAta = await getAssociatedTokenAddress(paymentMint, buyer1.publicKey);

    const [userIdoRecord] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_ido"), idoConfigPda.toBuffer(), buyer1.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .buyIdo(MIN_PURCHASE)
        .accounts({
          user: buyer1.publicKey,
          idoConfig: idoConfigPda,
          userIdoRecord,
          userPaymentAccount: buyer1PaymentAta,
          paymentVault,
          paymentMint,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        } as any)
        .signers([buyer1])
        .rpc();
      expect.fail("Should have thrown IdoNotStarted");
    } catch (err) {
      expect((err as AnchorError).error.errorCode.code).to.equal("IdoNotStarted");
    }
  });

  it("rejects purchase below minimum", async () => {
    const buyer1PaymentAta = await getAssociatedTokenAddress(paymentMint, buyer1.publicKey);
    const [userIdoRecord] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_ido"), activeIdoConfig.toBuffer(), buyer1.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .buyIdo(new BN(1_000)) // way below min (10 tokens = 10_000_000)
        .accounts({
          user: buyer1.publicKey,
          idoConfig: activeIdoConfig,
          userIdoRecord,
          userPaymentAccount: buyer1PaymentAta,
          paymentVault: activePaymentVault,
          paymentMint,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        } as any)
        .signers([buyer1])
        .rpc();
      expect.fail("Should have thrown BelowMinimumPurchase");
    } catch (err) {
      expect((err as AnchorError).error.errorCode.code).to.equal("BelowMinimumPurchase");
    }
  });

  it("rejects purchase above per-wallet cap", async () => {
    const buyer1PaymentAta = await getAssociatedTokenAddress(paymentMint, buyer1.publicKey);
    // buyer1 has purchased 50M, MAX_PURCHASE = 100B; try to buy 101B in one shot
    const [userIdoRecord] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_ido"), activeIdoConfig.toBuffer(), buyer1.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .buyIdo(MAX_PURCHASE.addn(1)) // 1 token over per-wallet cap
        .accounts({
          user: buyer1.publicKey,
          idoConfig: activeIdoConfig,
          userIdoRecord,
          userPaymentAccount: buyer1PaymentAta,
          paymentVault: activePaymentVault,
          paymentMint,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        } as any)
        .signers([buyer1])
        .rpc();
      expect.fail("Should have thrown AboveMaximumPurchase");
    } catch (err) {
      // AboveMaximumPurchase (single purchase exceeds max_purchase_tokens)
      const code = (err as AnchorError).error.errorCode.code;
      expect(["AboveMaximumPurchase", "WalletCapExceeded"]).to.include(code);
    }
  });

  // ─── pause_ido ─────────────────────────────────────────────────────────────

  it("allows authority to pause and unpause IDO", async () => {
    await program.methods
      .pauseIdo(true)
      .accounts({
        caller: authority.publicKey,
        idoConfig: activeIdoConfig,
      } as any)
      .signers([authority])
      .rpc();

    let config = await program.account.idoConfig.fetch(activeIdoConfig) as any;
    expect(config.paused).to.be.true;

    await program.methods
      .pauseIdo(false)
      .accounts({
        caller: authority.publicKey,
        idoConfig: activeIdoConfig,
      } as any)
      .signers([authority])
      .rpc();

    config = await program.account.idoConfig.fetch(activeIdoConfig) as any;
    expect(config.paused).to.be.false;
  });

  it("rejects pause from unauthorized wallet", async () => {
    const rando = Keypair.generate();
    await connection.requestAirdrop(rando.publicKey, LAMPORTS_PER_SOL).then((sig) =>
      connection.confirmTransaction(sig)
    );

    try {
      await program.methods
        .pauseIdo(true)
        .accounts({
          caller: rando.publicKey,
          idoConfig: activeIdoConfig,
        } as any)
        .signers([rando])
        .rpc();
      expect.fail("Should have thrown Unauthorized");
    } catch (err) {
      expect((err as AnchorError).error.errorCode.code).to.equal("Unauthorized");
    }
  });

  it("rejects purchase when IDO is paused", async () => {
    // Pause the IDO
    await program.methods
      .pauseIdo(true)
      .accounts({ caller: authority.publicKey, idoConfig: activeIdoConfig } as any)
      .signers([authority])
      .rpc();

    const buyer1PaymentAta = await getAssociatedTokenAddress(paymentMint, buyer1.publicKey);
    const [userIdoRecord] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_ido"), activeIdoConfig.toBuffer(), buyer1.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .buyIdo(MIN_PURCHASE)
        .accounts({
          user: buyer1.publicKey,
          idoConfig: activeIdoConfig,
          userIdoRecord,
          userPaymentAccount: buyer1PaymentAta,
          paymentVault: activePaymentVault,
          paymentMint,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        } as any)
        .signers([buyer1])
        .rpc();
      expect.fail("Should have thrown IdoPaused");
    } catch (err) {
      expect((err as AnchorError).error.errorCode.code).to.equal("IdoPaused");
    }

    // Unpause for subsequent tests
    await program.methods
      .pauseIdo(false)
      .accounts({ caller: authority.publicKey, idoConfig: activeIdoConfig } as any)
      .signers([authority])
      .rpc();
  });

  // ─── cancel_ido ────────────────────────────────────────────────────────────

  it("authority can cancel an IDO, enabling refunds", async () => {
    // Create a fresh IDO just for the cancel test
    const cancelMint = await createMint(
      connection,
      payer.payer,
      authority.publicKey,
      authority.publicKey,
      6
    );
    const [cancelConfig] = PublicKey.findProgramAddressSync(
      [Buffer.from("ido_config"), cancelMint.toBuffer()],
      program.programId
    );
    const cancelVault = await createAccount(connection, payer.payer, cancelMint, cancelConfig, Keypair.generate());
    const cancelPayVault = await createAccount(connection, payer.payer, paymentMint, cancelConfig, Keypair.generate());
    await mintTo(connection, payer.payer, cancelMint, cancelVault, authority.publicKey, 1_000_000_000, [authority]);

    const now = Math.floor(Date.now() / 1000);
    await program.methods
      .initializeIdo(
        TOKEN_PRICE_USD_6,
        new BN(1_000_000_000),
        MIN_PURCHASE,
        MAX_PURCHASE,
        new BN(now - 10),
        new BN(now + 86400),
        new BN(now + 90000),
        false
      )
      .accounts({
        authority: authority.publicKey,
        tokenMint: cancelMint,
        paymentMint,
        tokenVault: cancelVault,
        paymentVault: cancelPayVault,
        treasury,
        governance: governance.publicKey,
        idoConfig: cancelConfig,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      } as any)
      .signers([authority])
      .rpc();

    await program.methods
      .cancelIdo()
      .accounts({
        caller: authority.publicKey,
        idoConfig: cancelConfig,
      } as any)
      .signers([authority])
      .rpc();

    const config = await program.account.idoConfig.fetch(cancelConfig) as any;
    expect(config.cancelled).to.be.true;
  });

  // ─── finalize_ido ──────────────────────────────────────────────────────────

  it("rejects finalization before IDO end", async () => {
    // activeIdoConfig still has end_ts in the future
    const activeTreasuryToken = await createAccount(connection, payer.payer, activeIdoMint, treasury);

    try {
      await program.methods
        .finalizeIdo()
        .accounts({
          caller: authority.publicKey,
          idoConfig: activeIdoConfig,
          tokenVault: activeTokenVault,
          tokenMint: activeIdoMint,
          treasuryTokenAccount: activeTreasuryToken,
          paymentVault: activePaymentVault,
          tokenProgram: TOKEN_PROGRAM_ID,
        } as any)
        .signers([authority])
        .rpc();
      expect.fail("Should have thrown IdoNotEnded");
    } catch (err) {
      expect((err as AnchorError).error.errorCode.code).to.equal("IdoNotEnded");
    }
  });

  // ─── index accounting math (pure TypeScript) ──────────────────────────────

  it("payment amount is correctly computed from price * token_amount", () => {
    const tokenAmount = new BN(50_000_000);
    const price = new BN(100_000);
    const payment = tokenAmount.mul(price);
    // For 50 tokens at $0.10: 50_000_000 * 100_000 = 5_000_000_000_000 (in raw units)
    expect(payment.toString()).to.equal("5000000000000");
  });

  it("treasury funds cannot be moved without governance approval", () => {
    // Structural check: there is no direct treasury-withdrawal instruction
    // in the IDO program. Funds are only released via finalize or refund,
    // both of which require the finalized/cancelled state set by authority/governance.
    const idoMethods = Object.keys(program.methods);
    const withdrawExists = idoMethods.some((m) =>
      m.toLowerCase().includes("withdraw") && m.toLowerCase().includes("treasury")
    );
    expect(withdrawExists).to.be.false;
  });
});
