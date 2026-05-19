import { PublicKey, Keypair, Transaction, SystemProgram } from '@solana/web3.js';
import { 
  Program, 
  AnchorProvider, 
  BN, 
  web3 
} from '@coral-xyz/anchor';
import { 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  createBurnInstruction,
} from '@solana/spl-token';
import { MEMBRA_LLM_PROGRAM_ID } from './constants';

/**
 * Tokenization Layer for MEMBRA LLM Inference
 * 
 * This module handles:
 * - Prompt tokenization (calculating token cost based on prompt complexity)
 * - Token economy (burning tokens for inference, minting rewards)
 * - Token operations (mint, burn, transfer)
 */

export interface PromptTokenization {
  promptHash: string;
  tokenCount: number;
  complexityScore: number;
  baseCost: number;
  multiplier: number;
  totalCost: number;
}

export interface TokenEconomyConfig {
  baseTokenCost: number;
  complexityMultiplier: number;
  lengthMultiplier: number;
  rewardMultiplier: number;
  burnPerRequest: number;
}

export interface InferenceTokenRequest {
  prompt: string;
  modelId: string;
  maxTokens: number;
  temperature?: number;
  topP?: number;
}

export interface InferenceTokenResponse {
  requiredTokens: number;
  estimatedCost: number;
  tokenBalance: number;
  sufficient: boolean;
}

/**
 * Prompt Tokenizer
 * 
 * Calculates the token cost of a prompt based on:
 * - Length (number of characters/tokens)
 * - Complexity (entropy, unique words, special tokens)
 * - Model-specific pricing
 */
export class PromptTokenizer {
  private config: TokenEconomyConfig;

  constructor(config: Partial<TokenEconomyConfig> = {}) {
    this.config = {
      baseTokenCost: 10,
      complexityMultiplier: 1.5,
      lengthMultiplier: 0.01,
      rewardMultiplier: 10,
      burnPerRequest: 5,
      ...config,
    };
  }

  /**
   * Tokenize a prompt and calculate its cost
   */
  tokenize(prompt: string, modelId: string): PromptTokenization {
    const promptHash = this.hashPrompt(prompt);
    const tokenCount = this.estimateTokenCount(prompt);
    const complexityScore = this.calculateComplexity(prompt);
    
    const baseCost = this.config.baseTokenCost;
    const lengthMultiplier = tokenCount * this.config.lengthMultiplier;
    const complexityMultiplier = complexityScore * this.config.complexityMultiplier;
    
    const totalCost = Math.ceil(
      baseCost + lengthMultiplier + complexityMultiplier
    );

    return {
      promptHash,
      tokenCount,
      complexityScore,
      baseCost,
      multiplier: lengthMultiplier + complexityMultiplier,
      totalCost,
    };
  }

  /**
   * Estimate token count (simplified approximation)
   * In production, use actual tokenizer (tiktoken, sentencepiece, etc.)
   */
  private estimateTokenCount(text: string): number {
    // Rough approximation: ~4 characters per token for English
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate complexity score based on entropy and unique words
   */
  private calculateComplexity(text: string): number {
    const words = text.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    const uniqueRatio = uniqueWords.size / words.length;
    
    // Calculate character entropy (simplified)
    const charFrequency = new Map<string, number>();
    for (const char of text) {
      charFrequency.set(char, (charFrequency.get(char) || 0) + 1);
    }
    
    let entropy = 0;
    const length = text.length;
    for (const count of charFrequency.values()) {
      const probability = count / length;
      entropy -= probability * Math.log2(probability);
    }
    
    // Normalize entropy (max ~8 for ASCII)
    const normalizedEntropy = Math.min(entropy / 8, 1);
    
    // Combine metrics
    return (uniqueRatio * 0.6) + (normalizedEntropy * 0.4);
  }

  /**
   * Hash the prompt for on-chain verification
   */
  private hashPrompt(prompt: string): string {
    // In production, use proper SHA-256
    let hash = 0;
    for (let i = 0; i < prompt.length; i++) {
      const char = prompt.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }

  /**
   * Calculate token requirement for an inference request
   */
  calculateInferenceTokens(request: InferenceTokenRequest): number {
    const promptTokenization = this.tokenize(request.prompt, request.modelId);
    
    // Add output token estimation
    const outputTokens = request.maxTokens;
    const outputCost = outputTokens * this.config.lengthMultiplier;
    
    return promptTokenization.totalCost + Math.ceil(outputCost);
  }
}

/**
 * Token Economy Manager
 * 
 * Handles token operations for the MEMBRA LLM inference economy
 */
export class TokenEconomyManager {
  private program: Program;
  private provider: AnchorProvider;
  private tokenizer: PromptTokenizer;
  private tokenMint: PublicKey;

  constructor(
    program: Program,
    provider: AnchorProvider,
    tokenMint: PublicKey,
    config?: Partial<TokenEconomyConfig>
  ) {
    this.program = program;
    this.provider = provider;
    this.tokenizer = new PromptTokenizer(config);
    this.tokenMint = tokenMint;
  }

  /**
   * Check if user has sufficient tokens for inference
   */
  async checkTokenBalance(
    wallet: PublicKey,
    request: InferenceTokenRequest
  ): Promise<InferenceTokenResponse> {
    const requiredTokens = this.tokenizer.calculateInferenceTokens(request);
    
    const tokenAccount = await getAssociatedTokenAddress(
      this.tokenMint,
      wallet
    );

    try {
      const accountInfo = await this.provider.connection.getTokenAccountBalance(
        tokenAccount
      );
      
      const tokenBalance = Number(accountInfo.value.amount);
      const sufficient = tokenBalance >= requiredTokens;

      return {
        requiredTokens,
        estimatedCost: requiredTokens,
        tokenBalance,
        sufficient,
      };
    } catch {
      // Token account doesn't exist
      return {
        requiredTokens,
        estimatedCost: requiredTokens,
        tokenBalance: 0,
        sufficient: false,
      };
    }
  }

  /**
   * Burn tokens for inference request
   */
  async burnTokensForInference(
    wallet: PublicKey,
    amount: number,
    promptAsset: PublicKey
  ): Promise<Transaction> {
    const tokenAccount = await getAssociatedTokenAddress(
      this.tokenMint,
      wallet
    );

    const transaction = new Transaction();

    // Create token account if needed
    try {
      await this.provider.connection.getTokenAccountBalance(tokenAccount);
    } catch {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          this.provider.wallet.publicKey,
          tokenAccount,
          this.provider.wallet.publicKey,
          this.tokenMint
        )
      );
    }

    // Burn tokens
    transaction.add(
      createBurnInstruction(
        tokenAccount,
        this.tokenMint,
        wallet,
        amount
      )
    );

    return transaction;
  }

  /**
   * Mint reward tokens for inference provider
   */
  async mintRewardTokens(
    recipient: PublicKey,
    tokenCount: number,
    multiplier: number = 10
  ): Promise<Transaction> {
    const tokenAccount = await getAssociatedTokenAddress(
      this.tokenMint,
      recipient
    );

    const transaction = new Transaction();

    // Create token account if needed
    try {
      await this.provider.connection.getTokenAccountBalance(tokenAccount);
    } catch {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          this.provider.wallet.publicKey,
          tokenAccount,
          this.provider.wallet.publicKey,
          this.tokenMint
        )
      );
    }

    // Mint reward tokens
    const rewardAmount = tokenCount * multiplier;
    transaction.add(
      createMintToInstruction(
        this.tokenMint,
        tokenAccount,
        this.provider.wallet.publicKey,
        rewardAmount
      )
    );

    return transaction;
  }

  /**
   * Create a prompt asset on-chain
   */
  async createPromptAsset(
    prompt: string,
    metadataUri: string,
    tokenCost: number
  ): Promise<{ promptAsset: PublicKey; transaction: Transaction }> {
    const promptHash = this.tokenizer.tokenize(prompt, 'default').promptHash;
    
    const promptAsset = PublicKey.findProgramAddressSync(
      [
        Buffer.from('prompt_asset'),
        this.provider.wallet.publicKey.toBuffer(),
        Buffer.from(promptHash, 'hex'),
      ],
      MEMBRA_LLM_PROGRAM_ID
    )[0];

    const transaction = await this.program.methods
      .createPromptAsset(
        Buffer.from(promptHash, 'hex').slice(0, 32),
        new BN(tokenCost),
        metadataUri
      )
      .accounts({
        owner: this.provider.wallet.publicKey,
        promptAsset,
        tokenMint: this.tokenMint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .transaction();

    return { promptAsset, transaction };
  }

  /**
   * Submit inference request
   */
  async submitInferenceRequest(
    promptAsset: PublicKey,
    modelId: string,
    parameters: Buffer
  ): Promise<{ inferenceRequest: PublicKey; transaction: Transaction }> {
    const inferenceRequest = PublicKey.findProgramAddressSync(
      [
        Buffer.from('inference_request'),
        promptAsset.toBuffer(),
        this.provider.wallet.publicKey.toBuffer(),
        Buffer.from(Date.now().toString()),
      ],
      MEMBRA_LLM_PROGRAM_ID
    )[0];

    const transaction = await this.program.methods
      .submitInferenceRequest(promptAsset, modelId, parameters)
      .accounts({
        submitter: this.provider.wallet.publicKey,
        promptAsset,
        inferenceRequest,
        tokenMint: this.tokenMint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .transaction();

    return { inferenceRequest, transaction };
  }

  /**
   * Record inference response
   */
  async recordInferenceResponse(
    inferenceRequest: PublicKey,
    responseHash: string,
    merkleRoot: string,
    tokenCount: number
  ): Promise<{ inferenceResponse: PublicKey; transaction: Transaction }> {
    const inferenceResponse = PublicKey.findProgramAddressSync(
      [Buffer.from('inference_response'), inferenceRequest.toBuffer()],
      MEMBRA_LLM_PROGRAM_ID
    )[0];

    const transaction = await this.program.methods
      .recordInferenceResponse(
        inferenceRequest,
        Buffer.from(responseHash, 'hex').slice(0, 32),
        Buffer.from(merkleRoot, 'hex').slice(0, 32),
        new BN(tokenCount)
      )
      .accounts({
        authority: this.provider.wallet.publicKey,
        inferenceRequest,
        inferenceResponse,
        tokenMint: this.tokenMint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .transaction();

    return { inferenceResponse, transaction };
  }

  /**
   * Get tokenizer instance
   */
  getTokenizer(): PromptTokenizer {
    return this.tokenizer;
  }
}

/**
 * Token Price Oracle
 * 
 * Provides pricing information for different models and token types
 */
export class TokenPriceOracle {
  private modelPrices: Map<string, number>;

  constructor() {
    this.modelPrices = new Map([
      ['gpt-4', 100],
      ['gpt-3.5-turbo', 20],
      ['claude-3-opus', 120],
      ['claude-3-sonnet', 40],
      ['llama-2-70b', 10],
      ['llama-2-13b', 5],
      ['mistral-7b', 3],
    ]);
  }

  /**
   * Get price per 1K tokens for a model
   */
  getModelPrice(modelId: string): number {
    return this.modelPrices.get(modelId) || 10;
  }

  /**
   * Set price for a model
   */
  setModelPrice(modelId: string, price: number): void {
    this.modelPrices.set(modelId, price);
  }

  /**
   * Calculate cost for inference
   */
  calculateCost(
    modelId: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    const pricePer1K = this.getModelPrice(modelId);
    const inputCost = (inputTokens / 1000) * pricePer1K;
    const outputCost = (outputTokens / 1000) * (pricePer1K * 2); // Output is typically 2x
    
    return Math.ceil(inputCost + outputCost);
  }
}
