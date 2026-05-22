function getProvider() {
  if (typeof window === 'undefined') return null;
  if (window.phantom?.solana?.isPhantom) return window.phantom.solana;
  if (window.solana?.isPhantom) return window.solana;
  if (window.solana) return window.solana;
  return null;
}

export function detectWallet() {
  const provider = getProvider();
  return {
    available: !!provider,
    isPhantom: !!provider?.isPhantom,
    name: provider?.isPhantom ? 'Phantom' : provider ? 'Solana Wallet' : null,
  };
}

export async function connect() {
  const provider = getProvider();
  if (!provider) {
    throw new Error('No Solana wallet detected. Please install Phantom.');
  }
  const response = await provider.connect();
  const publicKey = response.publicKey.toString();
  return { publicKey, provider };
}

export async function disconnect() {
  const provider = getProvider();
  if (provider?.disconnect) {
    await provider.disconnect();
  }
}

export async function signMessage(message) {
  const provider = getProvider();
  if (!provider) throw new Error('Wallet not connected');
  const encodedMessage = typeof message === 'string'
    ? new TextEncoder().encode(message)
    : message;
  const { signature } = await provider.signMessage(encodedMessage, 'utf8');
  return signature;
}

export async function signTransaction(tx) {
  const provider = getProvider();
  if (!provider) throw new Error('Wallet not connected');
  return provider.signTransaction(tx);
}

export async function signAllTransactions(txs) {
  const provider = getProvider();
  if (!provider) throw new Error('Wallet not connected');
  return provider.signAllTransactions(txs);
}

export async function getBalance(publicKey) {
  const rpcUrl = import.meta.env.VITE_SOLANA_RPC || 'https://api.devnet.solana.com';
  const body = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'getBalance',
    params: [publicKey, { commitment: 'confirmed' }],
  });
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  const data = await res.json();
  const lamports = data?.result?.value ?? 0;
  return lamports / 1e9; // Convert lamports to SOL
}

export function isConnected() {
  const provider = getProvider();
  return !!(provider?.isConnected && provider?.publicKey);
}

export function getPublicKey() {
  const provider = getProvider();
  return provider?.publicKey?.toString() || null;
}

export function onAccountChange(callback) {
  const provider = getProvider();
  if (!provider) return () => {};
  const handler = (publicKey) => callback(publicKey?.toString() || null);
  provider.on('accountChanged', handler);
  return () => provider.off?.('accountChanged', handler);
}

export function onDisconnect(callback) {
  const provider = getProvider();
  if (!provider) return () => {};
  provider.on('disconnect', callback);
  return () => provider.off?.('disconnect', callback);
}

export default {
  detectWallet, connect, disconnect, signMessage, signTransaction,
  signAllTransactions, getBalance, isConnected, getPublicKey,
  onAccountChange, onDisconnect,
};
