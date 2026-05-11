export const mockMetrics = {
  lettersTyped: 1247,
  tokensEstimated: 311,
  noveltyScore: 78,
  informationDensity: 0.64,
  artifactPotential: 82,
  appraisedValue: 47.50,
  claimableReward: 0.00,
  fundedPoolStatus: 'Unfunded',
  originatorShare: 50,
  participantPool: 50,
  decayStep: 0,
  totalParticipants: 0,
  officialMoney: 0.00,
  stripeSettled: 0.00,
  testnetAmount: 0.00,
  paidReward: 0.00,
};

export const mockArtifacts = [
  { name: 'System Spec', status: 'Generated', hash: '0x8f3a...' },
  { name: 'UI Prompt', status: 'Generated', hash: '0x2b1c...' },
  { name: 'Code Module', status: 'Mapped', hash: '0x7d4e...' },
  { name: 'Proof Capsule', status: 'Created', hash: '0x9a2f...' },
  { name: 'QR Page', status: 'Created', hash: '0x1c8b...' },
];

export const mockAllocationConfig = {
  totalSupply: 1000000,
  creatorReservePercent: 50,
  participantPoolPercent: 50,
  maxParticipants: 1000,
  baseAllocationPerQRRead: 500,
  earlyReaderMultiplierFirst100: 2.0,
  decayPerScanPercent: 0.05,
  originatorFloorPercent: 10,
  claimWindowDays: 30,
};

export const mockRewardConfig = {
  initialOriginatorSharePercent: 50,
  participantPoolPercent: 50,
  decayBasis: 'scan_count',
  decayPerScanPercent: 1,
  floorOriginatorSharePercent: 10,
  maxParticipants: 40,
  claimability: 'claimable_only_if_pool_funded',
};

export const mockTerminalLines = [
  { type: 'prompt', text: 'membra init --session chat-20260511' },
  { type: 'output', text: 'Session initialized. Artifact stream active.' },
  { type: 'output', text: 'LLM appraisal: 47.50 USD (model opinion only)' },
  { type: 'output', text: 'Proof hash: 0x8f3a2b1c...' },
  { type: 'prompt', text: 'membra anchor --target github' },
  { type: 'output', text: 'Anchored: commit 3233ffa' },
  { type: 'prompt', text: 'membra deploy --cluster devnet' },
  { type: 'output', text: 'Devnet deployment: pending wallet signature' },
];

export const architectureSteps = [
  'Idea Monetization v0',
  'QR Gateway',
  'Solana Wallet Sig',
  'MCHAT Launch',
  'Proof Capsule',
  'External Settlement',
];

export const allocationFlow = [
  'QR read', 'Proof page', 'Accept terms', 'Wallet connect',
  'Anti-sybil', 'Scan recorded', 'Allocation calc',
  'Receipt hash', 'Claim ready', 'Payout if funded',
];

export const safetyRules = [
  'Terms acceptance required',
  'Wallet connect required',
  'Anti-sybil check active',
  'Claim window: 30 days',
];

export const riskChecklist = [
  'Policy engine: PASSED',
  'No private key: PASSED',
  'Funding source: REQUIRED',
  'Legal review: REQUIRED',
];

export const allocationTypes = [
  { type: 'Instant Credit', risk: 'Low', money: false },
  { type: 'Claimable Receipt', risk: 'Med', money: false },
  { type: 'Testnet Alloc', risk: 'Safe', money: false },
  { type: 'Mainnet Alloc', risk: 'High', money: false },
  { type: 'Funded Claim', risk: 'Cond', money: true },
];
