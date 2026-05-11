export const valueSteps = [
  { number: 1, label: 'Human Idea', status: 'complete' },
  { number: 2, label: 'Chat Captured', status: 'complete' },
  { number: 3, label: 'LLM Appraisal', status: 'complete' },
  { number: 4, label: 'Artifact Extracted', status: 'complete' },
  { number: 5, label: 'Proof Hashed', status: 'complete' },
  { number: 6, label: 'GitHub Anchored', status: 'pending' },
  { number: 7, label: 'IPFS Pinned', status: 'pending' },
  { number: 8, label: 'Devnet Deployed', status: 'pending' },
  { number: 9, label: 'QR Campaign', status: 'pending' },
  { number: 10, label: 'Support Received', status: 'pending' },
  { number: 11, label: 'Settlement Prepared', status: 'locked' },
  { number: 12, label: 'Mainnet Executed', status: 'locked' },
];

export const qrSteps = [
  { number: 1, label: 'QR Scan', status: 'pending' },
  { number: 2, label: 'Terms Displayed', status: 'pending' },
  { number: 3, label: 'Wallet Connect', status: 'pending' },
  { number: 4, label: 'Anti-Sybil Check', status: 'pending' },
  { number: 5, label: 'Support Payment', status: 'pending' },
  { number: 6, label: 'Rebate Calculated', status: 'pending' },
  { number: 7, label: 'Receipt Created', status: 'pending' },
  { number: 8, label: 'Proof Event Emitted', status: 'pending' },
];

export const tokenSteps = [
  { number: 1, label: 'Draft Manifest', status: 'complete' },
  { number: 2, label: 'Metadata Prepared', status: 'pending' },
  { number: 3, label: 'Legal Review', status: 'required' },
  { number: 4, label: 'Testnet Dry Run', status: 'required' },
  { number: 5, label: 'Mainnet Mint', status: 'locked', decisive: true },
  { number: 6, label: 'Authority Set', status: 'locked' },
  { number: 7, label: 'Proof Capsule', status: 'pending' },
  { number: 8, label: 'Liquidity Decision', status: 'locked' },
  { number: 9, label: 'Support Economy', status: 'locked' },
  { number: 10, label: 'Settlement', status: 'locked' },
];

export const chainDeploySteps = [
  { number: 1, label: 'Chat Captured', status: 'complete' },
  { number: 2, label: 'Plan Generated', status: 'complete' },
  { number: 3, label: 'Terminal Opened', status: 'complete' },
  { number: 4, label: 'Files Written', status: 'pending' },
  { number: 5, label: 'Tests Run', status: 'pending' },
  { number: 6, label: 'Artifacts Hashed', status: 'pending' },
  { number: 7, label: 'GitHub Anchored', status: 'pending' },
  { number: 8, label: 'Devnet Deployed', status: 'pending' },
  { number: 9, label: 'QR Campaign', status: 'pending' },
  { number: 10, label: 'Receipt Recorded', status: 'pending' },
  { number: 11, label: 'Mainnet Prepared', status: 'locked' },
  { number: 12, label: 'Approval Required', status: 'locked', decisive: true },
  { number: 13, label: 'Signed By User', status: 'locked' },
  { number: 14, label: 'Mainnet Executed', status: 'locked' },
];
