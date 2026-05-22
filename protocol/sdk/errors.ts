/**
 * MEMBRA Protocol – typed error hierarchy.
 *
 * Every program error maps to a subclass of MembraError so callers can
 * use `instanceof` checks and catch narrow categories cleanly.
 *
 * Anchor error codes are derived from the Rust `#[error_code]` enums in
 * each program's errors.rs file.  The numeric offsets follow Anchor 0.29
 * convention: program-specific codes start at 6000 (0x1770).
 */

// ─── Anchor error code offsets ───────────────────────────────────────────────

/** Anchor custom error base offset. */
const ANCHOR_ERROR_BASE = 6000;

// ─── Base ─────────────────────────────────────────────────────────────────────

export class MembraError extends Error {
  /** Raw Anchor error code, if this was parsed from an on-chain error. */
  readonly code: number | undefined;
  /** The program that emitted the error, if known. */
  readonly program: string | undefined;
  /** Original error before wrapping. */
  readonly cause: unknown;

  constructor(
    message: string,
    opts?: { code?: number; program?: string; cause?: unknown }
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = opts?.code;
    this.program = opts?.program;
    this.cause = opts?.cause;
    // Maintain proper prototype chain for instanceof in transpiled ES5
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ─── Program-specific subclasses ─────────────────────────────────────────────

export class IdoError extends MembraError {
  constructor(message: string, opts?: { code?: number; cause?: unknown }) {
    super(message, { ...opts, program: "membra_ido" });
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class RebaseError extends MembraError {
  constructor(message: string, opts?: { code?: number; cause?: unknown }) {
    super(message, { ...opts, program: "membra_rebase" });
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class RewardsError extends MembraError {
  constructor(message: string, opts?: { code?: number; cause?: unknown }) {
    super(message, { ...opts, program: "membra_rewards" });
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class GovernanceError extends MembraError {
  constructor(message: string, opts?: { code?: number; cause?: unknown }) {
    super(message, { ...opts, program: "membra_governance" });
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AttestationError extends MembraError {
  constructor(message: string, opts?: { code?: number; cause?: unknown }) {
    super(message, { ...opts, program: "membra_attestation" });
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ─── Infrastructure errors ────────────────────────────────────────────────────

export class NetworkError extends MembraError {
  constructor(message: string, opts?: { code?: number; cause?: unknown }) {
    super(message, { ...opts, program: undefined });
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AuthError extends MembraError {
  constructor(message: string, opts?: { code?: number; cause?: unknown }) {
    super(message, { ...opts, program: undefined });
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ─── Error code tables (Rust enum → number, relative to ANCHOR_ERROR_BASE) ───

/** membra_ido error codes – order matches the Rust enum. */
export const IDO_ERROR_CODES: Record<string, number> = {
  Unauthorized: ANCHOR_ERROR_BASE + 0,
  InvalidTimestamp: ANCHOR_ERROR_BASE + 1,
  InvalidPrice: ANCHOR_ERROR_BASE + 2,
  IdoNotStarted: ANCHOR_ERROR_BASE + 3,
  IdoEnded: ANCHOR_ERROR_BASE + 4,
  IdoNotEnded: ANCHOR_ERROR_BASE + 5,
  IdoPaused: ANCHOR_ERROR_BASE + 6,
  IdoCancelled: ANCHOR_ERROR_BASE + 7,
  IdoAlreadyFinalized: ANCHOR_ERROR_BASE + 8,
  HardCapReached: ANCHOR_ERROR_BASE + 9,
  BelowMinimumPurchase: ANCHOR_ERROR_BASE + 10,
  AboveMaximumPurchase: ANCHOR_ERROR_BASE + 11,
  WalletCapExceeded: ANCHOR_ERROR_BASE + 12,
  AlreadyClaimed: ANCHOR_ERROR_BASE + 13,
  ClaimNotStarted: ANCHOR_ERROR_BASE + 14,
  IdoNotFinalized: ANCHOR_ERROR_BASE + 15,
  AlreadyRefunded: ANCHOR_ERROR_BASE + 16,
  NothingToRefund: ANCHOR_ERROR_BASE + 17,
  ArithmeticOverflow: ANCHOR_ERROR_BASE + 18,
  ZeroPurchase: ANCHOR_ERROR_BASE + 19,
};

/** membra_rebase error codes. */
export const REBASE_ERROR_CODES: Record<string, number> = {
  Unauthorized: ANCHOR_ERROR_BASE + 0,
  RebaseNotDue: ANCHOR_ERROR_BASE + 1,
  StaleOraclePrice: ANCHOR_ERROR_BASE + 2,
  VolatilityCircuitBreakerTripped: ANCHOR_ERROR_BASE + 3,
  InvalidBandConfiguration: ANCHOR_ERROR_BASE + 4,
  InvalidRebaseCoefficient: ANCHOR_ERROR_BASE + 5,
  RebasePaused: ANCHOR_ERROR_BASE + 6,
  ArithmeticOverflow: ANCHOR_ERROR_BASE + 7,
  InvalidOracleSource: ANCHOR_ERROR_BASE + 8,
  PriceFeedMismatch: ANCHOR_ERROR_BASE + 9,
  InvalidEpochSeconds: ANCHOR_ERROR_BASE + 10,
};

/** membra_rewards error codes. */
export const REWARDS_ERROR_CODES: Record<string, number> = {
  Unauthorized: ANCHOR_ERROR_BASE + 0,
  PoolPaused: ANCHOR_ERROR_BASE + 1,
  InvalidAmount: ANCHOR_ERROR_BASE + 2,
  InvalidLockDuration: ANCHOR_ERROR_BASE + 3,
  PositionLocked: ANCHOR_ERROR_BASE + 4,
  NothingToUnstake: ANCHOR_ERROR_BASE + 5,
  NothingToClaim: ANCHOR_ERROR_BASE + 6,
  RewardVaultInsufficient: ANCHOR_ERROR_BASE + 7,
  ArithmeticOverflow: ANCHOR_ERROR_BASE + 8,
  EarlyExitAlreadyUsed: ANCHOR_ERROR_BASE + 9,
  PoolCapExceeded: ANCHOR_ERROR_BASE + 10,
  LockDurationBelowTierMinimum: ANCHOR_ERROR_BASE + 11,
};

/** membra_governance error codes. */
export const GOVERNANCE_ERROR_CODES: Record<string, number> = {
  Unauthorized: ANCHOR_ERROR_BASE + 0,
  NotASigner: ANCHOR_ERROR_BASE + 1,
  ProposalNotPending: ANCHOR_ERROR_BASE + 2,
  ProposalNotApproved: ANCHOR_ERROR_BASE + 3,
  AlreadyApproved: ANCHOR_ERROR_BASE + 4,
  SelfApprovalNotAllowed: ANCHOR_ERROR_BASE + 5,
  TimelockNotExpired: ANCHOR_ERROR_BASE + 6,
  ExecutionWindowExpired: ANCHOR_ERROR_BASE + 7,
  ThresholdNotMet: ANCHOR_ERROR_BASE + 8,
  GovernancePaused: ANCHOR_ERROR_BASE + 9,
  ActiveProposalsExist: ANCHOR_ERROR_BASE + 10,
  InvalidThreshold: ANCHOR_ERROR_BASE + 11,
  InvalidTimeLock: ANCHOR_ERROR_BASE + 12,
  ArithmeticOverflow: ANCHOR_ERROR_BASE + 13,
};

/** membra_attestation error codes – order matches errors.rs. */
export const ATTESTATION_ERROR_CODES: Record<string, number> = {
  Unauthorized: ANCHOR_ERROR_BASE + 0,
  ProtocolPaused: ANCHOR_ERROR_BASE + 1,
  ValidatorAlreadyRegistered: ANCHOR_ERROR_BASE + 2,
  InvalidAmount: ANCHOR_ERROR_BASE + 3,
  InsufficientStake: ANCHOR_ERROR_BASE + 4,
  ProjectNotAcceptingAttestations: ANCHOR_ERROR_BASE + 5,
  DuplicateAttestation: ANCHOR_ERROR_BASE + 6,
  InvalidScore: ANCHOR_ERROR_BASE + 7,
  AlreadyChallenged: ANCHOR_ERROR_BASE + 8,
  ChallengeAlreadyResolved: ANCHOR_ERROR_BASE + 9,
  ScoreAlreadyPublished: ANCHOR_ERROR_BASE + 10,
  InsufficientAttestations: ANCHOR_ERROR_BASE + 11,
  ProjectNotScoring: ANCHOR_ERROR_BASE + 12,
  ArithmeticOverflow: ANCHOR_ERROR_BASE + 13,
  RewardVaultInsufficient: ANCHOR_ERROR_BASE + 14,
  NoStakeToSlash: ANCHOR_ERROR_BASE + 15,
};

// ─── Reverse-lookup maps (error code → message) ───────────────────────────────

function buildReverseMap(
  table: Record<string, number>
): Map<number, string> {
  const m = new Map<number, string>();
  for (const [name, code] of Object.entries(table)) {
    m.set(code, name);
  }
  return m;
}

const IDO_CODE_MAP = buildReverseMap(IDO_ERROR_CODES);
const REBASE_CODE_MAP = buildReverseMap(REBASE_ERROR_CODES);
const REWARDS_CODE_MAP = buildReverseMap(REWARDS_ERROR_CODES);
const GOVERNANCE_CODE_MAP = buildReverseMap(GOVERNANCE_ERROR_CODES);
const ATTESTATION_CODE_MAP = buildReverseMap(ATTESTATION_ERROR_CODES);

// ─── Anchor error shape (duck-typed, no hard dependency on Anchor types) ─────

interface AnchorErrorLike {
  error?: {
    errorCode?: { code?: string; number?: number };
    errorMessage?: string;
    origin?: string;
  };
  logs?: string[];
}

function isAnchorErrorLike(err: unknown): err is AnchorErrorLike {
  return (
    typeof err === "object" &&
    err !== null &&
    "error" in err &&
    typeof (err as Record<string, unknown>).error === "object"
  );
}

// ─── parseAnchorError ─────────────────────────────────────────────────────────

/**
 * Inspect an unknown thrown value and return a typed MembraError subclass.
 *
 * Handles:
 * - Anchor AnchorError objects (have .error.errorCode)
 * - Plain Error objects whose message contains a known code name
 * - Strings
 * - Everything else (wrapped in MembraError)
 */
export function parseAnchorError(err: unknown): MembraError {
  if (err instanceof MembraError) return err;

  if (isAnchorErrorLike(err)) {
    const codeStr = err.error?.errorCode?.code ?? "";
    const codeNum = err.error?.errorCode?.number;
    const msg = err.error?.errorMessage ?? codeStr ?? "Unknown anchor error";
    const origin = err.error?.origin ?? "";

    // Determine program from origin string hint, then try numeric code ranges
    if (origin.includes("membra_ido") || IDO_CODE_MAP.has(codeNum ?? -1)) {
      return new IdoError(msg, { code: codeNum, cause: err });
    }
    if (origin.includes("membra_rebase") || REBASE_CODE_MAP.has(codeNum ?? -1)) {
      return new RebaseError(msg, { code: codeNum, cause: err });
    }
    if (origin.includes("membra_rewards") || REWARDS_CODE_MAP.has(codeNum ?? -1)) {
      return new RewardsError(msg, { code: codeNum, cause: err });
    }
    if (origin.includes("membra_governance") || GOVERNANCE_CODE_MAP.has(codeNum ?? -1)) {
      return new GovernanceError(msg, { code: codeNum, cause: err });
    }
    if (origin.includes("membra_attestation") || ATTESTATION_CODE_MAP.has(codeNum ?? -1)) {
      return new AttestationError(msg, { code: codeNum, cause: err });
    }

    // Check by error code string if no program origin
    if (codeStr in IDO_ERROR_CODES) return new IdoError(msg, { code: codeNum, cause: err });
    if (codeStr in REBASE_ERROR_CODES) return new RebaseError(msg, { code: codeNum, cause: err });
    if (codeStr in REWARDS_ERROR_CODES) return new RewardsError(msg, { code: codeNum, cause: err });
    if (codeStr in GOVERNANCE_ERROR_CODES) return new GovernanceError(msg, { code: codeNum, cause: err });
    if (codeStr in ATTESTATION_ERROR_CODES) return new AttestationError(msg, { code: codeNum, cause: err });

    return new MembraError(msg, { code: codeNum, cause: err });
  }

  if (err instanceof Error) {
    const msg = err.message;
    if (msg.includes("401") || msg.includes("403") || msg.includes("Unauthorized")) {
      return new AuthError(msg, { cause: err });
    }
    if (
      msg.includes("fetch") ||
      msg.includes("ECONNREFUSED") ||
      msg.includes("ETIMEDOUT") ||
      msg.includes("network") ||
      msg.includes("socket")
    ) {
      return new NetworkError(msg, { cause: err });
    }
    return new MembraError(msg, { cause: err });
  }

  if (typeof err === "string") {
    return new MembraError(err);
  }

  return new MembraError("An unknown error occurred", { cause: err });
}
