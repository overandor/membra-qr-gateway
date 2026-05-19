# MEMBRA LLM Inference Layer

A production-grade LLM inference layer built on Solana with tokenization, Merkle tree proofs, and GitHub integration.

## Overview

The MEMBRA LLM Inference Layer transforms LLM prompts into tokenized assets and records inference responses as on-chain transactions with verifiable Merkle tree proofs.

### Key Features

- **Prompts as Assets**: Every prompt is tokenized and stored as an on-chain asset
- **Responses as Transactions**: LLM responses are recorded as Solana transactions
- **Token Economy**: Built-in tokenization layer with cost estimation and token burning
- **Merkle Tree Proofs**: Deep Merkle tree verification for response authenticity
- **GitHub Integration**: Proof capsules stored in GitHub issues for public verification
- **Serverless Deployment**: Ready for Vercel/Netlify with edge functions
- **Solana Devnet**: Free devnet deployment for testing and development

## Architecture

### Components

1. **Anchor Program** (`protocol/programs/membra_llm/`)
   - Solana smart contracts for prompt assets, inference requests, and response recording
   - PDA-based account management
   - Token burning and minting integration

2. **Merkle Tree System** (`protocol/sdk/merkle.ts`)
   - Standard Merkle tree implementation
   - Deep Merkle tree for hierarchical proofs
   - GitHub proof capsule generation

3. **Tokenization Layer** (`protocol/sdk/tokenization.ts`)
   - Prompt tokenizer with complexity scoring
   - Token economy manager
   - Price oracle for different models

4. **Serverless API** (`api/llm-inference.ts`)
   - Tokenization endpoints
   - Inference submission
   - Response recording
   - Proof verification

5. **GitHub Integration** (`api/github-integration.ts`)
   - Proof capsule creation
   - Issue management
   - Webhook handling

6. **Frontend UI** (`src/components/llm/`)
   - React components for inference interface
   - Wallet integration
   - Real-time cost estimation

## Quick Start

### Prerequisites

- Node.js 18+
- Solana CLI
- Anchor Framework
- Rust toolchain

### Installation

```bash
# Install dependencies
npm install

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked
```

### Configuration

Set up environment variables:

```bash
# .env.local
SOLANA_RPC_URL=https://api.devnet.solana.com
TOKEN_MINT=your_token_mint_address
GITHUB_TOKEN=your_github_personal_access_token
```

### Build Anchor Program

```bash
cd protocol
anchor build
anchor deploy
```

### Run Locally

```bash
npm run dev
```

Visit `http://localhost:5173` to access the UI.

## Deployment

### Vercel Deployment

```bash
chmod +x scripts/deploy-vercel.sh
./scripts/deploy-vercel.sh
```

Or use the Vercel CLI directly:

```bash
vercel --prod
```

### Netlify Deployment

```bash
chmod +x scripts/deploy-netlify.sh
./scripts/deploy-netlify.sh
```

Or use the Netlify CLI directly:

```bash
netlify deploy --prod
```

## API Endpoints

### Tokenization

- `POST /api/llm/tokenize` - Tokenize a prompt
- `POST /api/llm/estimate` - Estimate inference cost

### Inference

- `POST /api/llm/submit` - Submit inference request
- `POST /api/llm/record-response` - Record LLM response
- `GET /api/llm/balance/:wallet` - Check token balance

### Proofs

- `POST /api/llm/verify-proof` - Verify Merkle proof
- `POST /api/llm/generate-proof-capsule` - Generate GitHub proof capsule
- `POST /api/llm/deep-merkle` - Create deep Merkle tree

### Models

- `GET /api/llm/models` - Get supported models and pricing

## SDK Usage

### Tokenization

```typescript
import { PromptTokenizer, TokenEconomyManager } from '@membra/protocol-sdk';

const tokenizer = new PromptTokenizer();
const tokenization = tokenizer.tokenize(
  "What is the meaning of life?",
  "gpt-4"
);

console.log(`Token cost: ${tokenization.totalCost}`);
```

### Merkle Proofs

```typescript
import { MerkleTree, GitHubProofCapsule } from '@membra/protocol-sdk';

const tree = new MerkleTree([leaf1, leaf2, leaf3]);
const proof = tree.generateProof(0);
const isValid = MerkleTree.verifyProof(proof);

const capsule = GitHubProofCapsule.createCommitProof(
  commitHash,
  proof,
  "owner/repo",
  "proofs.json"
);
```

### GitHub Integration

```typescript
import { GitHubProofManager } from '../api/github-integration';

const manager = new GitHubProofManager({
  token: process.env.GITHUB_TOKEN,
  owner: 'your-username',
  repo: 'proof-repository',
});

const { issueNumber, issueUrl } = await manager.createProofIssue(
  responseHash,
  proofCapsule,
  metadata
);
```

## Supported Models

| Model ID | Name | Price (tokens/1K) |
|----------|------|-------------------|
| gpt-4 | GPT-4 | 100 |
| gpt-3.5-turbo | GPT-3.5 Turbo | 20 |
| claude-3-opus | Claude 3 Opus | 120 |
| claude-3-sonnet | Claude 3 Sonnet | 40 |
| llama-2-70b | Llama 2 70B | 10 |
| llama-2-13b | Llama 2 13B | 5 |
| mistral-7b | Mistral 7B | 3 |

## Token Economy

### Token Cost Calculation

```
Total Cost = Base Cost + (Token Count × Length Multiplier) + (Complexity Score × Complexity Multiplier)
```

- **Base Cost**: 10 tokens (minimum)
- **Length Multiplier**: 0.01 per token
- **Complexity Multiplier**: 1.5 per complexity point (0-1 scale)

### Token Flow

1. User submits prompt with estimated token cost
2. Tokens are burned from user's wallet
3. Inference request is created on-chain
4. LLM generates response
5. Response is recorded with Merkle proof
6. Reward tokens are minted to inference provider

## Security Considerations

- All prompts and responses are hashed on-chain
- Private data is never stored on-chain
- Merkle proofs provide cryptographic verification
- GitHub proof capsules provide public audit trail
- Token burning prevents spam
- Rate limiting on API endpoints

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

- GitHub Issues: https://github.com/membra/membra-qr-gateway/issues
- Documentation: https://docs.membra.io
- Discord: https://discord.gg/membra
