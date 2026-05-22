export const CHAIN_CONFIGS = {
  localnet: {
    name: 'Localnet',
    network: 'localnet',
    rpcEndpoint: 'http://127.0.0.1:8899',
    wsEndpoint: 'ws://127.0.0.1:8900',
    explorerBase: 'https://explorer.solana.com',
    explorerCluster: '?cluster=custom&customUrl=http%3A%2F%2F127.0.0.1%3A8899',
    programIds: {
      qrGateway: 'QRGat3wayLoc4lPr0gr4mId11111111111111111111',
      ido: 'IDOLoc4lPr0gr4mId1111111111111111111111111111',
      rebase: 'REB4seLoc4lPr0gr4mId111111111111111111111111',
      rewards: 'REW4rdsLoc4lPr0gr4mId1111111111111111111111',
      governance: 'G0v3rn4nceLoc4lPr0gr4mId11111111111111111111',
    },
    tokenMints: {
      MCHAT: 'MCH4TLoc4lM1ntAddr3ss1111111111111111111111',
      USDC: 'USDC1oc4lM1ntAddr3ss111111111111111111111111',
    },
    tokenDecimals: {
      SOL: 9,
      MCHAT: 6,
      USDC: 6,
    },
    confirmations: 1,
    isMainnet: false,
  },
  devnet: {
    name: 'Devnet',
    network: 'devnet',
    rpcEndpoint: 'https://api.devnet.solana.com',
    wsEndpoint: 'wss://api.devnet.solana.com',
    explorerBase: 'https://explorer.solana.com',
    explorerCluster: '?cluster=devnet',
    programIds: {
      qrGateway: 'QRGat3wayD3vn3tPr0gr4mId111111111111111111',
      ido: 'IDOD3vn3tPr0gr4mId11111111111111111111111111',
      rebase: 'REB4s3D3vn3tPr0gr4mId111111111111111111111',
      rewards: 'REW4rdsD3vn3tPr0gr4mId1111111111111111111111',
      governance: 'G0v3rn4nc3D3vn3tPr0gr4mId1111111111111111111',
    },
    tokenMints: {
      MCHAT: 'MCH4TD3vn3tM1ntAddr3ss111111111111111111111',
      USDC: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    },
    tokenDecimals: {
      SOL: 9,
      MCHAT: 6,
      USDC: 6,
    },
    confirmations: 1,
    isMainnet: false,
  },
  mainnet: {
    name: 'Mainnet',
    network: 'mainnet-beta',
    rpcEndpoint: 'https://api.mainnet-beta.solana.com',
    wsEndpoint: 'wss://api.mainnet-beta.solana.com',
    explorerBase: 'https://explorer.solana.com',
    explorerCluster: '',
    programIds: {
      qrGateway: 'QRGat3wayM41nn3tPr0gr4mId111111111111111111',
      ido: 'IDOM41nn3tPr0gr4mId1111111111111111111111111',
      rebase: 'REB4s3M41nn3tPr0gr4mId11111111111111111111',
      rewards: 'REW4rdsM41nn3tPr0gr4mId111111111111111111111',
      governance: 'G0v3rn4nc3M41nn3tPr0gr4mId111111111111111111',
    },
    tokenMints: {
      MCHAT: 'MCH4TM41nn3tM1ntAddr3ss1111111111111111111',
      USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    },
    tokenDecimals: {
      SOL: 9,
      MCHAT: 6,
      USDC: 6,
    },
    confirmations: 32,
    isMainnet: true,
  },
};

export function getChainConfig(network = 'devnet') {
  return CHAIN_CONFIGS[network] || CHAIN_CONFIGS.devnet;
}

export function getExplorerUrl(signature, network = 'devnet', type = 'tx') {
  const config = getChainConfig(network);
  return `${config.explorerBase}/${type}/${signature}${config.explorerCluster}`;
}

export function getActiveNetwork() {
  return import.meta.env.VITE_SOLANA_NETWORK || 'devnet';
}

export const ACTIVE_CHAIN = getChainConfig(getActiveNetwork());
