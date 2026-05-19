import { keccak256 } from 'ethereum-cryptography/keccak';
import { bytesToHex, hexToBytes } from 'ethereum-cryptography/utils';
import { createHash } from 'crypto';

/**
 * Merkle Tree implementation for LLM inference response verification
 * Supports deep Merkle trees for GitHub proof capsule integration
 */

export interface MerkleProof {
  leaf: Uint8Array;
  proof: Uint8Array[];
  leafIndex: number;
  root: Uint8Array;
}

export interface MerkleLeaf {
  hash: Uint8Array;
  data: unknown;
  index: number;
}

export class MerkleTree {
  private leaves: Uint8Array[];
  private root: Uint8Array;
  private depth: number;

  constructor(leaves: Uint8Array[]) {
    this.leaves = leaves;
    this.depth = this.calculateDepth(leaves.length);
    this.root = this.calculateRoot();
  }

  /**
   * Calculate the depth of the tree based on number of leaves
   */
  private calculateDepth(leafCount: number): number {
    if (leafCount === 0) return 0;
    return Math.ceil(Math.log2(leafCount));
  }

  /**
   * Calculate the Merkle root from all leaves
   */
  private calculateRoot(): Uint8Array {
    if (this.leaves.length === 0) {
      return new Uint8Array(32);
    }

    let currentLevel = [...this.leaves];

    while (currentLevel.length > 1) {
      const nextLevel: Uint8Array[] = [];

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
        
        const combined = new Uint8Array(left.length + right.length);
        combined.set(left);
        combined.set(right, left.length);
        
        const hash = this.hash(combined);
        nextLevel.push(hash);
      }

      currentLevel = nextLevel;
    }

    return currentLevel[0];
  }

  /**
   * Hash function using SHA-256
   */
  private hash(data: Uint8Array): Uint8Array {
    const hash = createHash('sha256');
    hash.update(data);
    return new Uint8Array(hash.digest());
  }

  /**
   * Get the root of the tree
   */
  getRoot(): Uint8Array {
    return this.root;
  }

  /**
   * Get the depth of the tree
   */
  getDepth(): number {
    return this.depth;
  }

  /**
   * Generate a Merkle proof for a specific leaf
   */
  generateProof(leafIndex: number): MerkleProof {
    if (leafIndex < 0 || leafIndex >= this.leaves.length) {
      throw new Error('Invalid leaf index');
    }

    const proof: Uint8Array[] = [];
    let currentIndex = leafIndex;
    let currentLevel = [...this.leaves];

    while (currentLevel.length > 1) {
      const nextLevel: Uint8Array[] = [];
      
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;

        // If current node is left child, add right sibling to proof
        if (currentIndex === i) {
          proof.push(right);
        } 
        // If current node is right child, add left sibling to proof
        else if (currentIndex === i + 1) {
          proof.push(left);
        }

        const combined = new Uint8Array(left.length + right.length);
        combined.set(left);
        combined.set(right, left.length);
        
        const hash = this.hash(combined);
        nextLevel.push(hash);
      }

      currentIndex = Math.floor(currentIndex / 2);
      currentLevel = nextLevel;
    }

    return {
      leaf: this.leaves[leafIndex],
      proof,
      leafIndex,
      root: this.root,
    };
  }

  /**
   * Verify a Merkle proof
   */
  static verifyProof(proof: MerkleProof): boolean {
    let currentHash = proof.leaf;
    let currentIndex = proof.leafIndex;

    for (const sibling of proof.proof) {
      const combined = new Uint8Array(currentHash.length + sibling.length);
      
      if (currentIndex % 2 === 0) {
        combined.set(currentHash);
        combined.set(sibling, currentHash.length);
      } else {
        combined.set(sibling);
        combined.set(currentHash, sibling.length);
      }

      const hash = createHash('sha256');
      hash.update(combined);
      currentHash = new Uint8Array(hash.digest());
      
      currentIndex = Math.floor(currentIndex / 2);
    }

    return bytesToHex(currentHash) === bytesToHex(proof.root);
  }

  /**
   * Create a Merkle tree from an array of data items
   */
  static fromData<T>(items: T[], hashFunction: (item: T) => Uint8Array): MerkleTree {
    const leaves = items.map(hashFunction);
    return new MerkleTree(leaves);
  }

  /**
   * Create a Merkle tree from hex strings
   */
  static fromHexStrings(hexStrings: string[]): MerkleTree {
    const leaves = hexStrings.map(hex => hexToBytes(hex));
    return new MerkleTree(leaves);
  }

  /**
   * Create a Merkle tree for LLM inference responses
   */
  static fromInferenceResponses(responses: Array<{
    responseHash: string;
    inferenceRequest: string;
    tokenCount: number;
    timestamp: number;
  }>): MerkleTree {
    const hashFunction = (response: typeof responses[0]): Uint8Array => {
      const data = JSON.stringify(response);
      const hash = createHash('sha256');
      hash.update(data);
      return new Uint8Array(hash.digest());
    };

    return MerkleTree.fromData(responses, hashFunction);
  }
}

/**
 * Deep Merkle Tree for GitHub proof capsule integration
 * Supports hierarchical proof structures for complex verification
 */
export class DeepMerkleTree {
  private tree: Map<string, MerkleTree>;
  private root: Uint8Array;

  constructor() {
    this.tree = new Map();
    this.root = new Uint8Array(32);
  }

  /**
   * Add a subtree to the deep Merkle tree
   */
  addSubtree(key: string, subtree: MerkleTree): void {
    this.tree.set(key, subtree);
    this.recalculateRoot();
  }

  /**
   * Recalculate the root from all subtrees
   */
  private recalculateRoot(): void {
    if (this.tree.size === 0) {
      this.root = new Uint8Array(32);
      return;
    }

    const subtreeRoots = Array.from(this.tree.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, tree]) => tree.getRoot());

    const combined = new Uint8Array(subtreeRoots.reduce((acc, root) => acc + root.length, 0));
    let offset = 0;
    for (const root of subtreeRoots) {
      combined.set(root, offset);
      offset += root.length;
    }

    const hash = createHash('sha256');
    hash.update(combined);
    this.root = new Uint8Array(hash.digest());
  }

  /**
   * Get the root of the deep Merkle tree
   */
  getRoot(): Uint8Array {
    return this.root;
  }

  /**
   * Generate a proof for a specific subtree and leaf
   */
  generateDeepProof(subtreeKey: string, leafIndex: number): {
    subtreeProof: MerkleProof;
    rootProof: Uint8Array[];
  } {
    const subtree = this.tree.get(subtreeKey);
    if (!subtree) {
      throw new Error('Subtree not found');
    }

    const subtreeProof = subtree.generateProof(leafIndex);
    
    // Generate proof for the subtree root in the main tree
    const subtreeRoot = subtree.getRoot();
    const subtreeRootHex = bytesToHex(subtreeRoot);
    
    const rootProof: Uint8Array[] = [];
    const sortedKeys = Array.from(this.tree.keys()).sort();
    const subtreeIndex = sortedKeys.indexOf(subtreeKey);
    
    let currentIndex = subtreeIndex;
    let currentLevel = sortedKeys.map(key => {
      const tree = this.tree.get(key)!;
      return tree.getRoot();
    });

    while (currentLevel.length > 1) {
      const nextLevel: Uint8Array[] = [];
      
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;

        if (currentIndex === i) {
          rootProof.push(right);
        } else if (currentIndex === i + 1) {
          rootProof.push(left);
        }

        const combined = new Uint8Array(left.length + right.length);
        combined.set(left);
        combined.set(right, left.length);
        
        const hash = createHash('sha256');
        hash.update(combined);
        nextLevel.push(new Uint8Array(hash.digest()));
      }

      currentIndex = Math.floor(currentIndex / 2);
      currentLevel = nextLevel;
    }

    return {
      subtreeProof,
      rootProof,
    };
  }

  /**
   * Verify a deep Merkle proof
   */
  static verifyDeepProof(
    deepProof: { subtreeProof: MerkleProof; rootProof: Uint8Array[] },
    expectedRoot: Uint8Array
  ): boolean {
    // First verify the subtree proof
    if (!MerkleTree.verifyProof(deepProof.subtreeProof)) {
      return false;
    }

    // Then verify the subtree root in the main tree
    let currentHash = deepProof.subtreeProof.root;
    let currentIndex = deepProof.subtreeProof.leafIndex;

    for (const sibling of deepProof.rootProof) {
      const combined = new Uint8Array(currentHash.length + sibling.length);
      
      if (currentIndex % 2 === 0) {
        combined.set(currentHash);
        combined.set(sibling, currentHash.length);
      } else {
        combined.set(sibling);
        combined.set(currentHash, sibling.length);
      }

      const hash = createHash('sha256');
      hash.update(combined);
      currentHash = new Uint8Array(hash.digest());
      
      currentIndex = Math.floor(currentIndex / 2);
    }

    return bytesToHex(currentHash) === bytesToHex(expectedRoot);
  }
}

/**
 * GitHub Proof Capsule integration
 * Creates proof capsules for GitHub issue/file verification
 */
export class GitHubProofCapsule {
  /**
   * Create a proof capsule for a GitHub commit
   */
  static createCommitProof(
    commitHash: string,
    merkleProof: MerkleProof,
    repository: string,
    filePath: string
  ): string {
    const capsule = {
      commitHash,
      repository,
      filePath,
      merkleRoot: bytesToHex(merkleProof.root),
      leafIndex: merkleProof.leafIndex,
      proof: merkleProof.proof.map(bytesToHex),
      timestamp: Date.now(),
    };

    return JSON.stringify(capsule, null, 2);
  }

  /**
   * Verify a proof capsule from GitHub
   */
  static verifyCommitProof(capsuleJson: string): boolean {
    try {
      const capsule = JSON.parse(capsuleJson);
      const proof: MerkleProof = {
        leaf: hexToBytes(capsule.merkleRoot), // In practice, this would be the actual leaf
        proof: capsule.proof.map((p: string) => hexToBytes(p)),
        leafIndex: capsule.leafIndex,
        root: hexToBytes(capsule.merkleRoot),
      };

      return MerkleTree.verifyProof(proof);
    } catch {
      return false;
    }
  }

  /**
   * Generate a GitHub issue comment with proof capsule
   */
  static generateIssueComment(
    inferenceResponse: string,
    proofCapsule: string
  ): string {
    return `
## LLM Inference Response Proof

**Response Hash**: \`${inferenceResponse}\`

### Proof Capsule
\`\`\`json
${proofCapsule}
\`\`\`

### Verification
To verify this proof capsule, use the MEMBRA LLM SDK:
\`\`\`typescript
import { GitHubProofCapsule } from '@membra/llm-sdk';

const isValid = GitHubProofCapsule.verifyCommitProof(proofCapsule);
console.log('Proof valid:', isValid);
\`\`\`

---
*Generated by MEMBRA LLM Inference Layer*
    `.trim();
  }
}
