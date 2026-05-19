/**
 * Serverless API for MEMBRA LLM Inference Layer
 * Deployable on Vercel/Netlify
 * 
 * This API provides endpoints for:
 * - Prompt tokenization and cost estimation
 * - Inference request submission
 * - Response recording with Merkle proofs
 * - Token balance checking
 * - GitHub proof capsule generation
 */

import { Request, Response } from 'express';
import { 
  PromptTokenizer, 
  TokenEconomyManager, 
  TokenPriceOracle,
  InferenceTokenRequest,
  InferenceTokenResponse,
} from '../protocol/sdk/tokenization';
import { 
  MerkleTree, 
  DeepMerkleTree, 
  GitHubProofCapsule,
  MerkleProof,
} from '../protocol/sdk/merkle';
import { 
  Connection, 
  PublicKey, 
  Keypair, 
  Transaction,
} from '@solana/web3.js';
import { 
  Program, 
  AnchorProvider, 
  Wallet,
} from '@coral-xyz/anchor';

// Configuration
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const TOKEN_MINT = process.env.TOKEN_MINT || new PublicKey('token_mint_address');
const MEMBRA_LLM_PROGRAM_ID = new PublicKey('MlLm111111111111111111111111111111111111111');

// Initialize connection
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

// Mock wallet for serverless environment (in production, use proper key management)
const mockWallet = new Wallet(Keypair.generate());
const provider = new AnchorProvider(connection, mockWallet, { commitment: 'confirmed' });

// Initialize services
const tokenizer = new PromptTokenizer();
const priceOracle = new TokenPriceOracle();

/**
 * POST /api/llm/tokenize
 * Tokenize a prompt and calculate cost
 */
export async function tokenizePrompt(req: Request, res: Response) {
  try {
    const { prompt, modelId } = req.body;

    if (!prompt || !modelId) {
      return res.status(400).json({ error: 'Missing prompt or modelId' });
    }

    const tokenization = tokenizer.tokenize(prompt, modelId);

    return res.json({
      success: true,
      tokenization,
    });
  } catch (error) {
    console.error('Tokenization error:', error);
    return res.status(500).json({ error: 'Tokenization failed' });
  }
}

/**
 * POST /api/llm/estimate
 * Estimate token cost for inference request
 */
export async function estimateCost(req: Request, res: Response) {
  try {
    const request: InferenceTokenRequest = req.body;

    if (!request.prompt || !request.modelId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const requiredTokens = tokenizer.calculateInferenceTokens(request);
    const estimatedCost = priceOracle.calculateCost(
      request.modelId,
      tokenizer.tokenize(request.prompt, request.modelId).tokenCount,
      request.maxTokens
    );

    return res.json({
      success: true,
      estimate: {
        requiredTokens,
        estimatedCost,
        modelId: request.modelId,
        promptTokens: tokenizer.tokenize(request.prompt, request.modelId).tokenCount,
        maxOutputTokens: request.maxTokens,
      },
    });
  } catch (error) {
    console.error('Estimation error:', error);
    return res.status(500).json({ error: 'Cost estimation failed' });
  }
}

/**
 * POST /api/llm/submit
 * Submit an inference request
 */
export async function submitInference(req: Request, res: Response) {
  try {
    const { 
      walletAddress, 
      prompt, 
      modelId, 
      parameters,
      metadataUri,
    } = req.body;

    if (!walletAddress || !prompt || !modelId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const wallet = new PublicKey(walletAddress);
    const tokenization = tokenizer.tokenize(prompt, modelId);

    // Create prompt asset
    const promptAsset = PublicKey.findProgramAddressSync(
      [
        Buffer.from('prompt_asset'),
        wallet.toBuffer(),
        Buffer.from(tokenization.promptHash, 'hex'),
      ],
      MEMBRA_LLM_PROGRAM_ID
    )[0];

    // Create inference request
    const inferenceRequest = PublicKey.findProgramAddressSync(
      [
        Buffer.from('inference_request'),
        promptAsset.toBuffer(),
        wallet.toBuffer(),
        Buffer.from(Date.now().toString()),
      ],
      MEMBRA_LLM_PROGRAM_ID
    )[0];

    return res.json({
      success: true,
      promptAsset: promptAsset.toString(),
      inferenceRequest: inferenceRequest.toString(),
      tokenization,
      status: 'pending',
    });
  } catch (error) {
    console.error('Submit error:', error);
    return res.status(500).json({ error: 'Inference submission failed' });
  }
}

/**
 * POST /api/llm/record-response
 * Record an LLM inference response with Merkle proof
 */
export async function recordResponse(req: Request, res: Response) {
  try {
    const {
      inferenceRequest,
      responseText,
      modelId,
      tokenCount,
    } = req.body;

    if (!inferenceRequest || !responseText) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Hash the response
    const crypto = require('crypto');
    const responseHash = crypto.createHash('sha256').update(responseText).digest('hex');

    // Create Merkle tree for this response
    const merkleTree = new MerkleTree([
      Buffer.from(responseHash, 'hex'),
    ]);

    const merkleRoot = merkleTree.getRoot();
    const merkleProof = merkleTree.generateProof(0);

    const inferenceResponse = PublicKey.findProgramAddressSync(
      [Buffer.from('inference_response'), new PublicKey(inferenceRequest).toBuffer()],
      MEMBRA_LLM_PROGRAM_ID
    )[0];

    return res.json({
      success: true,
      inferenceResponse: inferenceResponse.toString(),
      responseHash,
      merkleRoot: Buffer.from(merkleRoot).toString('hex'),
      merkleProof: merkleProof.proof.map(p => Buffer.from(p).toString('hex')),
      tokenCount,
      status: 'completed',
    });
  } catch (error) {
    console.error('Record response error:', error);
    return res.status(500).json({ error: 'Response recording failed' });
  }
}

/**
 * POST /api/llm/verify-proof
 * Verify a Merkle proof for an inference response
 */
export async function verifyProof(req: Request, res: Response) {
  try {
    const {
      leaf,
      proof,
      leafIndex,
      root,
    } = req.body;

    if (!leaf || !proof || !root) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const merkleProof: MerkleProof = {
      leaf: Buffer.from(leaf, 'hex'),
      proof: proof.map((p: string) => Buffer.from(p, 'hex')),
      leafIndex,
      root: Buffer.from(root, 'hex'),
    };

    const isValid = MerkleTree.verifyProof(merkleProof);

    return res.json({
      success: true,
      valid: isValid,
    });
  } catch (error) {
    console.error('Verify proof error:', error);
    return res.status(500).json({ error: 'Proof verification failed' });
  }
}

/**
 * POST /api/llm/generate-proof-capsule
 * Generate a GitHub proof capsule
 */
export async function generateProofCapsule(req: Request, res: Response) {
  try {
    const {
      inferenceResponse,
      commitHash,
      repository,
      filePath,
      merkleRoot,
    } = req.body;

    if (!inferenceResponse || !commitHash || !repository) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const merkleProof: MerkleProof = {
      leaf: Buffer.from(inferenceResponse, 'hex'),
      proof: [],
      leafIndex: 0,
      root: Buffer.from(merkleRoot || inferenceResponse, 'hex'),
    };

    const proofCapsule = GitHubProofCapsule.createCommitProof(
      commitHash,
      merkleProof,
      repository,
      filePath || 'inference-responses.json'
    );

    const issueComment = GitHubProofCapsule.generateIssueComment(
      inferenceResponse,
      proofCapsule
    );

    return res.json({
      success: true,
      proofCapsule,
      issueComment,
    });
  } catch (error) {
    console.error('Generate proof capsule error:', error);
    return res.status(500).json({ error: 'Proof capsule generation failed' });
  }
}

/**
 * GET /api/llm/balance/:wallet
 * Check token balance for a wallet
 */
export async function checkBalance(req: Request, res: Response) {
  try {
    const { wallet } = req.params;

    if (!wallet) {
      return res.status(400).json({ error: 'Missing wallet address' });
    }

    const walletPubkey = new PublicKey(wallet);
    const tokenAccount = await connection.getTokenAccountBalance(
      new PublicKey(TOKEN_MINT)
    );

    return res.json({
      success: true,
      wallet,
      balance: tokenAccount.value.uiAmountString,
      decimals: tokenAccount.value.decimals,
    });
  } catch (error) {
    console.error('Balance check error:', error);
    return res.status(500).json({ error: 'Balance check failed' });
  }
}

/**
 * GET /api/llm/models
 * Get supported models and pricing
 */
export async function getModels(req: Request, res: Response) {
  try {
    const models = [
      { id: 'gpt-4', name: 'GPT-4', price: priceOracle.getModelPrice('gpt-4') },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', price: priceOracle.getModelPrice('gpt-3.5-turbo') },
      { id: 'claude-3-opus', name: 'Claude 3 Opus', price: priceOracle.getModelPrice('claude-3-opus') },
      { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', price: priceOracle.getModelPrice('claude-3-sonnet') },
      { id: 'llama-2-70b', name: 'Llama 2 70B', price: priceOracle.getModelPrice('llama-2-70b') },
      { id: 'llama-2-13b', name: 'Llama 2 13B', price: priceOracle.getModelPrice('llama-2-13b') },
      { id: 'mistral-7b', name: 'Mistral 7B', price: priceOracle.getModelPrice('mistral-7b') },
    ];

    return res.json({
      success: true,
      models,
    });
  } catch (error) {
    console.error('Get models error:', error);
    return res.status(500).json({ error: 'Failed to get models' });
  }
}

/**
 * POST /api/llm/deep-merkle
 * Create a deep Merkle tree for multiple responses
 */
export async function createDeepMerkle(req: Request, res: Response) {
  try {
    const { responses } = req.body;

    if (!responses || !Array.isArray(responses)) {
      return res.status(400).json({ error: 'Missing responses array' });
    }

    const deepTree = new DeepMerkleTree();

    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      const subtree = MerkleTree.fromInferenceResponses([response]);
      deepTree.addSubtree(`response_${i}`, subtree);
    }

    const root = deepTree.getRoot();

    return res.json({
      success: true,
      root: Buffer.from(root).toString('hex'),
      subtreeCount: responses.length,
    });
  } catch (error) {
    console.error('Deep Merkle error:', error);
    return res.status(500).json({ error: 'Deep Merkle tree creation failed' });
  }
}

// Vercel/Netlify handler export
export default async function handler(req: Request, res: Response) {
  const { method, path } = req;

  // Route handling
  if (method === 'POST' && path === '/api/llm/tokenize') {
    return tokenizePrompt(req, res);
  }
  if (method === 'POST' && path === '/api/llm/estimate') {
    return estimateCost(req, res);
  }
  if (method === 'POST' && path === '/api/llm/submit') {
    return submitInference(req, res);
  }
  if (method === 'POST' && path === '/api/llm/record-response') {
    return recordResponse(req, res);
  }
  if (method === 'POST' && path === '/api/llm/verify-proof') {
    return verifyProof(req, res);
  }
  if (method === 'POST' && path === '/api/llm/generate-proof-capsule') {
    return generateProofCapsule(req, res);
  }
  if (method === 'GET' && path.match(/^\/api\/llm\/balance\/.+/)) {
    return checkBalance(req, res);
  }
  if (method === 'GET' && path === '/api/llm/models') {
    return getModels(req, res);
  }
  if (method === 'POST' && path === '/api/llm/deep-merkle') {
    return createDeepMerkle(req, res);
  }

  return res.status(404).json({ error: 'Not found' });
}
