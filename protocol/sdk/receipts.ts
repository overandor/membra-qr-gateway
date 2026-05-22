/**
 * MEMBRA QR Gateway – off-chain receipt SDK.
 *
 * Receipts provide a lightweight audit trail linking off-chain QR gateway
 * events to on-chain Solana state.  The `ReceiptClient` communicates with
 * the MEMBRA receipt API and verifies integrity via SHA-256.
 *
 * Verification algorithm:
 *   canonical_string = `${artifactId}|${artifactTitle}|${ownerWallet}|${createdAt}`
 *   expected_hash    = hex(sha256(canonical_string))
 *   receipt.proofHash must equal expected_hash
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** A receipt record returned by the MEMBRA gateway API. */
export interface ArtifactReceipt {
  /** Unique artifact identifier (e.g. project ID or NFT mint address). */
  artifactId: string;
  /** Human-readable title of the artifact. */
  artifactTitle: string;
  /** Base-58 encoded Solana wallet address of the owner. */
  ownerWallet: string;
  /** Hex-encoded SHA-256 proof hash over canonical fields. */
  proofHash: string;
  /** Solana slot at which the on-chain event was confirmed, or null if pending. */
  solanaSlot: number | null;
  /** Unix timestamp (seconds) when the receipt was created. */
  createdAt: number;
  /** True when the receipt has been verified against the on-chain state. */
  verified: boolean;
}

/** Options for the `listReceipts` call. */
export interface ListReceiptsOptions {
  page?: number;
  /** Results per page (default: 20, max: 100). */
  pageSize?: number;
  /** ISO 8601 date string – return receipts created on or after this date. */
  fromDate?: string;
  /** Filter by verified status. */
  verified?: boolean;
}

/** Response envelope from the API for list endpoints. */
interface ApiListResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── SHA-256 helper ───────────────────────────────────────────────────────────

/**
 * Compute the hex-encoded SHA-256 of a UTF-8 string.
 * Uses the Web Crypto API available in browsers and Node 18+.
 * Falls back to the Node.js `crypto` module for older Node environments.
 */
async function sha256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);

  if (
    typeof globalThis !== "undefined" &&
    globalThis.crypto &&
    typeof globalThis.crypto.subtle?.digest === "function"
  ) {
    // Web Crypto (browser / Node 18+)
    const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", encoded);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  // Node.js crypto fallback
  // Dynamic import so bundlers can tree-shake this for browser targets.
  const { createHash } = await import("crypto");
  return createHash("sha256").update(encoded).digest("hex");
}

/**
 * Build the canonical string used as SHA-256 input for a receipt.
 * The canonical form is stable: fields are pipe-separated in a fixed order.
 */
function canonicalString(receipt: Pick<ArtifactReceipt, "artifactId" | "artifactTitle" | "ownerWallet" | "createdAt">): string {
  return `${receipt.artifactId}|${receipt.artifactTitle}|${receipt.ownerWallet}|${receipt.createdAt}`;
}

// ─── ReceiptClient ────────────────────────────────────────────────────────────

/**
 * Client for the MEMBRA off-chain receipt API.
 *
 * All methods throw `ReceiptApiError` on non-2xx HTTP responses.
 */
export class ReceiptClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  /**
   * @param apiBaseUrl  Base URL of the MEMBRA receipt API (e.g. "https://api.membra.io/v1").
   * @param apiKey      Optional API key sent as `X-API-Key` header.
   */
  constructor(apiBaseUrl: string, apiKey?: string) {
    // Strip trailing slash for consistent URL building.
    this.baseUrl = apiBaseUrl.replace(/\/$/, "");
    this.headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (apiKey) {
      this.headers["X-API-Key"] = apiKey;
    }
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private async request<T>(
    method: "GET" | "POST" | "DELETE",
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const init: RequestInit = {
      method,
      headers: this.headers,
    };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    let response: Response;
    try {
      response = await fetch(url, init);
    } catch (networkErr: unknown) {
      const msg = networkErr instanceof Error ? networkErr.message : String(networkErr);
      throw new ReceiptApiError(`Network error reaching ${url}: ${msg}`, 0);
    }

    if (!response.ok) {
      let detail = "";
      try {
        const payload = (await response.json()) as { message?: string; error?: string };
        detail = payload.message ?? payload.error ?? "";
      } catch {
        detail = await response.text().catch(() => "");
      }
      throw new ReceiptApiError(
        `HTTP ${response.status} from ${method} ${url}${detail ? `: ${detail}` : ""}`,
        response.status
      );
    }

    return response.json() as Promise<T>;
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Create a new receipt for an artifact.
   *
   * The server computes the `proofHash` and `createdAt` timestamp and returns
   * the full ArtifactReceipt record.
   *
   * @param artifactId  Unique artifact identifier.
   * @param ownerWallet Base-58 Solana wallet of the artifact owner.
   */
  async createReceipt(
    artifactId: string,
    ownerWallet: string
  ): Promise<ArtifactReceipt> {
    if (!artifactId || artifactId.trim() === "") {
      throw new TypeError("artifactId must be a non-empty string");
    }
    if (!ownerWallet || ownerWallet.trim() === "") {
      throw new TypeError("ownerWallet must be a non-empty string");
    }

    return this.request<ArtifactReceipt>("POST", "/receipts", {
      artifactId,
      ownerWallet,
    });
  }

  /**
   * Fetch a receipt by artifact ID.
   * Returns null if the receipt does not exist (404).
   */
  async getReceipt(artifactId: string): Promise<ArtifactReceipt | null> {
    try {
      return await this.request<ArtifactReceipt>(
        "GET",
        `/receipts/${encodeURIComponent(artifactId)}`
      );
    } catch (err) {
      if (err instanceof ReceiptApiError && err.statusCode === 404) {
        return null;
      }
      throw err;
    }
  }

  /**
   * Verify the integrity of a receipt by recomputing its SHA-256 proof hash.
   *
   * This is a purely local computation — no network call is made.
   *
   * @returns true if the receipt's proofHash matches the recomputed hash.
   */
  async verifyReceipt(receipt: ArtifactReceipt): Promise<boolean> {
    const expected = await sha256Hex(canonicalString(receipt));
    return expected === receipt.proofHash.toLowerCase();
  }

  /**
   * List receipts for a given owner wallet, with optional pagination.
   */
  async listReceipts(
    owner: string,
    opts: ListReceiptsOptions = {}
  ): Promise<ArtifactReceipt[]> {
    const params = new URLSearchParams();
    params.set("owner", owner);
    if (opts.page !== undefined) params.set("page", String(opts.page));
    if (opts.pageSize !== undefined) params.set("pageSize", String(opts.pageSize));
    if (opts.fromDate !== undefined) params.set("fromDate", opts.fromDate);
    if (opts.verified !== undefined) params.set("verified", String(opts.verified));

    const response = await this.request<ApiListResponse<ArtifactReceipt>>(
      "GET",
      `/receipts?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Mark a receipt as verified by submitting a verification attestation.
   * Typically called by the gateway after confirming the on-chain slot.
   */
  async markReceiptVerified(
    artifactId: string,
    solanaSlot: number
  ): Promise<ArtifactReceipt> {
    return this.request<ArtifactReceipt>(
      "POST",
      `/receipts/${encodeURIComponent(artifactId)}/verify`,
      { solanaSlot }
    );
  }

  /**
   * Fetch and verify a receipt in one call.
   * Returns the receipt if it exists and passes verification, null otherwise.
   */
  async getVerifiedReceipt(artifactId: string): Promise<ArtifactReceipt | null> {
    const receipt = await this.getReceipt(artifactId);
    if (!receipt) return null;
    const valid = await this.verifyReceipt(receipt);
    if (!valid) return null;
    return receipt;
  }
}

// ─── Error class ──────────────────────────────────────────────────────────────

export class ReceiptApiError extends Error {
  /** HTTP status code returned by the server, or 0 for network-level failures. */
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "ReceiptApiError";
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
