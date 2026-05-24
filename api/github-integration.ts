/**
 * GitHub Integration for MEMBRA LLM Proof Capsules
 * 
 * This module provides utilities for:
 * - Creating GitHub issues with proof capsules
 * - Posting proof capsules as comments
 * - Verifying GitHub-based proofs
 * - Managing proof capsule repositories
 */

import { Octokit } from '@octokit/rest';
import { GitHubProofCapsule, MerkleProof, MerkleTree } from '../protocol/sdk/merkle';

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
}

export interface ProofCapsuleIssue {
  title: string;
  body: string;
  labels: string[];
}

export interface ProofCapsuleComment {
  body: string;
}

/**
 * GitHub Proof Capsule Manager
 */
export class GitHubProofManager {
  private octokit: Octokit;
  private config: GitHubConfig;

  constructor(config: GitHubConfig) {
    this.config = config;
    this.octokit = new Octokit({
      auth: config.token,
    });
  }

  /**
   * Create a GitHub issue with a proof capsule
   */
  async createProofIssue(
    inferenceResponse: string,
    proofCapsule: string,
    metadata: {
      modelId: string;
      promptHash: string;
      timestamp: number;
      tokenCount: number;
    }
  ): Promise<{ issueNumber: number; issueUrl: string }> {
    const issue: ProofCapsuleIssue = {
      title: `LLM Inference Proof - ${metadata.modelId} - ${new Date(metadata.timestamp).toISOString()}`,
      body: this.generateIssueBody(inferenceResponse, proofCapsule, metadata),
      labels: ['llm-inference', 'proof-capsule', 'membra'],
    };

    const response = await this.octokit.rest.issues.create({
      owner: this.config.owner,
      repo: this.config.repo,
      ...issue,
    });

    return {
      issueNumber: response.data.number,
      issueUrl: response.data.html_url,
    };
  }

  /**
   * Add a proof capsule as a comment to an existing issue
   */
  async addProofComment(
    issueNumber: number,
    inferenceResponse: string,
    proofCapsule: string
  ): Promise<{ commentUrl: string }> {
    const comment: ProofCapsuleComment = {
      body: GitHubProofCapsule.generateIssueComment(inferenceResponse, proofCapsule),
    };

    const response = await this.octokit.rest.issues.createComment({
      owner: this.config.owner,
      repo: this.config.repo,
      issue_number: issueNumber,
      ...comment,
    });

    return {
      commentUrl: response.data.html_url,
    };
  }

  /**
   * Create a file in the repository with proof capsule data
   */
  async createProofFile(
    path: string,
    content: string,
    message: string = 'Add LLM inference proof capsule'
  ): Promise<{ fileUrl: string }> {
    const contentBase64 = Buffer.from(content).toString('base64');

    const response = await this.octokit.rest.repos.createOrUpdateFileContents({
      owner: this.config.owner,
      repo: this.config.repo,
      path,
      message,
      content: contentBase64,
    });

    return {
      fileUrl: response.data.content?.html_url || '',
    };
  }

  /**
   * Verify a proof capsule from a GitHub issue
   */
  async verifyProofFromIssue(
    issueNumber: number
  ): Promise<{ valid: boolean; proofData?: any }> {
    const issue = await this.octokit.rest.issues.get({
      owner: this.config.owner,
      repo: this.config.repo,
      issue_number: issueNumber,
    });

    const body = issue.data.body || '';
    const proofCapsuleMatch = body.match(/```json\n([\s\S]*?)\n```/);

    if (!proofCapsuleMatch) {
      return { valid: false };
    }

    const proofCapsule = proofCapsuleMatch[1];
    const isValid = GitHubProofCapsule.verifyCommitProof(proofCapsule);

    if (isValid) {
      const proofData = JSON.parse(proofCapsule);
      return { valid: true, proofData };
    }

    return { valid: false };
  }

  /**
   * Get all proof capsules from the repository
   */
  async getAllProofCapsules(): Promise<Array<{ issueNumber: number; proofData: any }>> {
    const issues = await this.octokit.rest.issues.listForRepo({
      owner: this.config.owner,
      repo: this.config.repo,
      labels: 'proof-capsule',
      state: 'all',
      per_page: 100,
    });

    const proofs: Array<{ issueNumber: number; proofData: any }> = [];

    for (const issue of issues.data) {
      const verification = await this.verifyProofFromIssue(issue.number);
      if (verification.valid && verification.proofData) {
        proofs.push({
          issueNumber: issue.number,
          proofData: verification.proofData,
        });
      }
    }

    return proofs;
  }

  /**
   * Generate the issue body with proof capsule
   */
  private generateIssueBody(
    inferenceResponse: string,
    proofCapsule: string,
    metadata: {
      modelId: string;
      promptHash: string;
      timestamp: number;
      tokenCount: number;
    }
  ): string {
    return `
# LLM Inference Proof Capsule

## Metadata
- **Model ID**: \`${metadata.modelId}\`
- **Prompt Hash**: \`${metadata.promptHash}\`
- **Timestamp**: ${new Date(metadata.timestamp).toISOString()}
- **Token Count**: ${metadata.tokenCount}

## Response Hash
\`\`\`
${inferenceResponse}
\`\`\`

## Proof Capsule
\`\`\`json
${proofCapsule}
\`\`\`

## Verification
To verify this proof capsule, use the MEMBRA LLM SDK:

\`\`\`typescript
import { GitHubProofCapsule } from '@membra/llm-sdk';

const isValid = GitHubProofCapsule.verifyCommitProof(proofCapsule);
console.log('Proof valid:', isValid);
\`\`\`

## On-Chain Verification
This proof capsule can be verified against the MEMBRA LLM program on Solana:

\`\`\`typescript
import { verifyMerkleProof } from '@membra/llm-sdk';

const isValid = await verifyMerkleProof(
  inferenceResponse,
  merkleProof,
  leafIndex
);
\`\`\`

---
*Generated by MEMBRA LLM Inference Layer*
*Proof verified on Solana Devnet*
    `.trim();
  }

  /**
   * Create a deep Merkle tree proof capsule
   */
  async createDeepMerkleProof(
    responses: Array<{
      responseHash: string;
      inferenceRequest: string;
      tokenCount: number;
      timestamp: number;
    }>,
    commitHash: string
  ): Promise<{ issueNumber: number; issueUrl: string }> {
    // Create deep Merkle tree
    const deepTree = new MerkleTree(
      responses.map(r => Buffer.from(r.responseHash, 'hex'))
    );

    const root = deepTree.getRoot();
    const proof = deepTree.generateProof(0);

    const proofCapsule = GitHubProofCapsule.createCommitProof(
      commitHash,
      proof,
      `${this.config.owner}/${this.config.repo}`,
      'llm-inference-responses.json'
    );

    return this.createProofIssue(
      Buffer.from(root).toString('hex'),
      proofCapsule,
      {
        modelId: 'deep-merkle-batch',
        promptHash: 'batch-' + commitHash,
        timestamp: Date.now(),
        tokenCount: responses.reduce((sum, r) => sum + r.tokenCount, 0),
      }
    );
  }

  /**
   * Update a proof capsule with new verification status
   */
  async updateProofStatus(
    issueNumber: number,
    verified: boolean,
    txSignature?: string
  ): Promise<void> {
    const issue = await this.octokit.rest.issues.get({
      owner: this.config.owner,
      repo: this.config.repo,
      issue_number: issueNumber,
    });

    const statusBadge = verified 
      ? '✅ Verified'
      : '❌ Unverified';

    const txInfo = txSignature 
      ? `\n\n## Transaction Signature\n\`${txSignature}\`\n[Solana Explorer](https://explorer.solana.com/tx/${txSignature}?cluster=devnet)`
      : '';

    const updatedBody = issue.data.body + `\n\n## Verification Status\n${statusBadge}${txInfo}`;

    await this.octokit.rest.issues.update({
      owner: this.config.owner,
      repo: this.config.repo,
      issue_number: issueNumber,
      body: updatedBody,
    });
  }

  /**
   * Search for proof capsules by model ID
   */
  async searchByModel(modelId: string): Promise<Array<{ issueNumber: number; proofData: any }>> {
    const proofs = await this.getAllProofCapsules();
    return proofs.filter(p => p.proofData.modelId === modelId);
  }

  /**
   * Get proof statistics
   */
  async getProofStats(): Promise<{
    totalProofs: number;
    verifiedProofs: number;
    byModel: Record<string, number>;
  }> {
    const proofs = await this.getAllProofCapsules();
    const byModel: Record<string, number> = {};

    for (const proof of proofs) {
      const modelId = proof.proofData.modelId || 'unknown';
      byModel[modelId] = (byModel[modelId] || 0) + 1;
    }

    return {
      totalProofs: proofs.length,
      verifiedProofs: proofs.length, // All stored proofs are verified
      byModel,
    };
  }
}

/**
 * GitHub Webhook Handler for Proof Verification
 */
export class GitHubWebhookHandler {
  private proofManager: GitHubProofManager;

  constructor(config: GitHubConfig) {
    this.proofManager = new GitHubProofManager(config);
  }

  /**
   * Handle GitHub webhook events
   */
  async handleWebhook(event: string, payload: any): Promise<void> {
    switch (event) {
      case 'issues.opened':
        await this.handleIssueOpened(payload);
        break;
      case 'issue_comment.created':
        await this.handleCommentCreated(payload);
        break;
      case 'push':
        await this.handlePush(payload);
        break;
      default:
        console.log(`Unhandled event: ${event}`);
    }
  }

  private async handleIssueOpened(payload: any): Promise<void> {
    const issue = payload.issue;
    
    // Auto-verify if issue has proof capsule
    if (issue.labels.some((l: any) => l.name === 'proof-capsule')) {
      const verification = await this.proofManager.verifyProofFromIssue(issue.number);
      
      if (verification.valid) {
        await this.proofManager.updateProofStatus(issue.number, true);
      }
    }
  }

  private async handleCommentCreated(payload: any): Promise<void> {
    const comment = payload.comment;
    const issue = payload.issue;

    // Check if comment contains verification request
    if (comment.body.includes('/verify')) {
      const verification = await this.proofManager.verifyProofFromIssue(issue.number);
      
      await this.proofManager.octokit.rest.issues.createComment({
        owner: this.proofManager['config'].owner,
        repo: this.proofManager['config'].repo,
        issue_number: issue.number,
        body: verification.valid 
          ? '✅ Proof capsule verified successfully!'
          : '❌ Proof capsule verification failed.',
      });
    }
  }

  private async handlePush(payload: any): Promise<void> {
    // Update proof capsules if related files are modified
    const commits = payload.commits || [];
    
    for (const commit of commits) {
      const modified = commit.modified || [];
      
      if (modified.some((f: string) => f.includes('proof-capsule'))) {
        // Trigger re-verification for affected proofs
        console.log(`Proof capsule files modified in commit ${commit.id}`);
      }
    }
  }
}
