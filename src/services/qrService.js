import { apiGet, apiPost } from './apiClient.js';

export async function generateQR(artifactId, size = 256) {
  return apiGet('/api/qr/generate', { artifactId, size });
  // Returns { dataUrl: string, hash: string, url: string }
}

export async function scanQR(imageData) {
  return apiPost('/api/qr/scan', { imageData });
  // Returns { decoded: string, artifactId: string, valid: boolean }
}

export async function verifyQRHash(hash) {
  return apiGet('/api/qr/verify', { hash });
  // Returns { valid: boolean, artifact: object|null, onChainProof: string|null }
}

export async function getQRArtifact(id) {
  return apiGet(`/api/qr/artifact/${encodeURIComponent(id)}`);
  // Returns { id, hash, name, creator, createdAt, status, metadata }
}

export async function listArtifacts(page = 1, limit = 20) {
  return apiGet('/api/qr/artifacts', { page, limit });
  // Returns { items: [], total: number, page: number, limit: number }
}

export default { generateQR, scanQR, verifyQRHash, getQRArtifact, listArtifacts };
