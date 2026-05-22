import React, { useState, useCallback } from 'react';
import { Search, CheckCircle, XCircle, AlertTriangle, ExternalLink, Hash } from 'lucide-react';
import { cn, truncateHash } from '../../utils';
import { verifyQRHash } from '../../services/qrService.js';
import { validateHash } from '../../security/inputValidation.js';
import { Button } from '../ui/Button.jsx';
import { StatusPill } from '../ui/StatusPill.jsx';
import { getExplorerUrl } from '../../data/chainMetadata.js';

const RESULT_ICONS = {
  valid: CheckCircle,
  invalid: XCircle,
  not_found: AlertTriangle,
};

const RESULT_STYLES = {
  valid: 'border-success/30 bg-success/10',
  invalid: 'border-danger/30 bg-danger/10',
  not_found: 'border-primary-gold/30 bg-primary-gold/10',
};

const RESULT_STATUS = {
  valid: 'verified',
  invalid: 'failed',
  not_found: 'pending',
};

export function QRVerificationPanel({ initialHash = '', className }) {
  const [hash, setHash] = useState(initialHash);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [inputError, setInputError] = useState(null);

  const handleVerify = useCallback(async () => {
    setInputError(null);
    setResult(null);

    const validation = validateHash(hash);
    if (!validation.valid) {
      setInputError(validation.error);
      return;
    }

    setLoading(true);
    try {
      const data = await verifyQRHash(validation.value);
      if (data?.valid) {
        setResult({ type: 'valid', data });
      } else if (data === null || data?.artifact === null) {
        setResult({ type: 'not_found', data });
      } else {
        setResult({ type: 'invalid', data });
      }
    } catch (err) {
      if (err.status === 404) {
        setResult({ type: 'not_found', data: null });
      } else {
        setResult({ type: 'invalid', error: err.message });
      }
    } finally {
      setLoading(false);
    }
  }, [hash]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') handleVerify();
  }, [handleVerify]);

  const artifact = result?.data?.artifact;
  const onChainProof = result?.data?.onChainProof;
  const ResultIcon = result ? (RESULT_ICONS[result.type] || AlertTriangle) : null;

  return (
    <div className={cn('glass-card p-6', className)}>
      <div className="flex items-center gap-2 mb-5">
        <Hash className="w-5 h-5 text-primary-orange" />
        <h3 className="font-semibold">QR Verification</h3>
      </div>

      {/* Input */}
      <div className="mb-4">
        <label className="block text-xs text-text-muted mb-1.5">Artifact Hash (SHA-256)</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={hash}
            onChange={(e) => setHash(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter 64-character hex hash…"
            className={cn(
              'flex-1 px-3 py-2 rounded-xl text-sm font-mono',
              'bg-background-100 border text-text-primary placeholder:text-text-muted',
              'focus:outline-none focus:ring-2 focus:ring-primary-orange/40',
              inputError ? 'border-danger/40' : 'border-white/10'
            )}
          />
          <Button
            variant="primary"
            size="medium"
            onClick={handleVerify}
            loading={loading}
            icon={Search}
          >
            Verify
          </Button>
        </div>
        {inputError && (
          <p className="text-xs text-danger mt-1">{inputError}</p>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className={cn('p-4 rounded-xl border', RESULT_STYLES[result.type])}>
          <div className="flex items-center gap-2 mb-3">
            <ResultIcon className={cn(
              'w-5 h-5 flex-shrink-0',
              result.type === 'valid' && 'text-success',
              result.type === 'invalid' && 'text-danger',
              result.type === 'not_found' && 'text-primary-gold',
            )} />
            <div className="flex items-center gap-2">
              <p className={cn(
                'font-semibold text-sm',
                result.type === 'valid' && 'text-success',
                result.type === 'invalid' && 'text-danger',
                result.type === 'not_found' && 'text-primary-gold',
              )}>
                {result.type === 'valid' && 'Hash Verified'}
                {result.type === 'invalid' && 'Verification Failed'}
                {result.type === 'not_found' && 'Not Found'}
              </p>
              <StatusPill status={RESULT_STATUS[result.type]} />
            </div>
          </div>

          {result.error && (
            <p className="text-xs text-text-muted mb-2">{result.error}</p>
          )}

          {artifact && (
            <div className="space-y-2 mt-3">
              {artifact.name && (
                <div>
                  <p className="text-xs text-text-muted">Artifact Name</p>
                  <p className="text-sm font-medium text-text-primary">{artifact.name}</p>
                </div>
              )}
              {artifact.creator && (
                <div>
                  <p className="text-xs text-text-muted">Creator</p>
                  <p className="text-xs font-mono text-text-primary">{truncateHash(artifact.creator)}</p>
                </div>
              )}
              {artifact.createdAt && (
                <div>
                  <p className="text-xs text-text-muted">Created</p>
                  <p className="text-sm text-text-primary">{new Date(artifact.createdAt).toLocaleString()}</p>
                </div>
              )}
            </div>
          )}

          {onChainProof && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-xs text-text-muted mb-1">On-Chain Record</p>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-mono text-text-primary">{truncateHash(onChainProof)}</p>
                <a
                  href={getExplorerUrl(onChainProof, 'devnet', 'tx')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary-orange hover:underline"
                >
                  View <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {result.type === 'not_found' && (
            <p className="text-xs text-text-muted mt-2">
              No artifact found with this hash. It may not have been registered yet, or the hash may be incorrect.
            </p>
          )}
        </div>
      )}

      {/* Hint */}
      {!result && !loading && (
        <p className="text-xs text-text-muted">
          Enter the SHA-256 hash from a MEMBRA QR code to verify the artifact's authenticity and view its on-chain proof.
        </p>
      )}
    </div>
  );
}

export default QRVerificationPanel;
