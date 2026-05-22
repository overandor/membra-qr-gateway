import React, { useCallback } from 'react';
import { ExternalLink, Share2, Download, Hash, Clock, Shield, CheckCircle } from 'lucide-react';
import { cn, truncateHash, formatCurrency } from '../../utils';
import { Button } from '../ui/Button.jsx';
import { StatusPill } from '../ui/StatusPill.jsx';
import { getExplorerUrl } from '../../data/chainMetadata.js';

export function QRReceipt({ receipt, className }) {
  if (!receipt) return null;

  const {
    id,
    artifactId,
    artifactName,
    hash,
    creator,
    supporter,
    amount,
    timestamp,
    onChainTx,
    status = 'pending',
    network = 'devnet',
  } = receipt;

  const explorerUrl = onChainTx ? getExplorerUrl(onChainTx, network, 'tx') : null;
  const artifactUrl = artifactId ? getExplorerUrl(artifactId, network, 'address') : null;

  const formattedTime = timestamp
    ? new Date(timestamp).toLocaleString()
    : '—';

  const handleShare = useCallback(async () => {
    const shareData = {
      title: `MEMBRA Receipt: ${artifactName || artifactId}`,
      text: `Receipt ID: ${id}\nArtifact: ${artifactName || artifactId}\nHash: ${hash}`,
      url: explorerUrl || window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(JSON.stringify(shareData, null, 2));
    }
  }, [id, artifactName, artifactId, hash, explorerUrl]);

  const handleExport = useCallback(() => {
    const data = JSON.stringify(receipt, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `receipt-${id || 'membra'}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }, [receipt, id]);

  return (
    <div className={cn('glass-card p-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary-orange" />
          <h3 className="font-semibold">Scan Receipt</h3>
        </div>
        <StatusPill status={status} />
      </div>

      <div className="space-y-3">
        {/* Artifact */}
        <div className="p-3 rounded-lg bg-background-100 border border-white/5">
          <p className="text-xs text-text-muted mb-1">Artifact</p>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-text-primary">{artifactName || 'Unknown Artifact'}</p>
            {artifactId && (
              <p className="text-xs font-mono text-primary-orange">{truncateHash(artifactId)}</p>
            )}
          </div>
        </div>

        {/* Hash */}
        {hash && (
          <div className="p-3 rounded-lg bg-background-100 border border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <Hash className="w-3.5 h-3.5 text-text-muted" />
              <p className="text-xs text-text-muted">Content Hash</p>
            </div>
            <p className="text-xs font-mono text-text-primary break-all">{hash}</p>
          </div>
        )}

        {/* Timestamp */}
        <div className="p-3 rounded-lg bg-background-100 border border-white/5">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-3.5 h-3.5 text-text-muted" />
            <p className="text-xs text-text-muted">Timestamp</p>
          </div>
          <p className="text-sm text-text-primary">{formattedTime}</p>
        </div>

        {/* Parties */}
        {(creator || supporter) && (
          <div className="grid grid-cols-2 gap-3">
            {creator && (
              <div className="p-3 rounded-lg bg-background-100 border border-white/5">
                <p className="text-xs text-text-muted mb-1">Creator</p>
                <p className="text-xs font-mono text-text-primary">{truncateHash(creator, 4, 4)}</p>
              </div>
            )}
            {supporter && (
              <div className="p-3 rounded-lg bg-background-100 border border-white/5">
                <p className="text-xs text-text-muted mb-1">Supporter</p>
                <p className="text-xs font-mono text-text-primary">{truncateHash(supporter, 4, 4)}</p>
              </div>
            )}
          </div>
        )}

        {/* Amount */}
        {amount !== undefined && amount !== null && (
          <div className="p-3 rounded-lg bg-primary-gold/10 border border-primary-gold/20">
            <p className="text-xs text-text-muted mb-1">Amount</p>
            <p className="text-lg font-bold text-primary-gold">{formatCurrency(amount)}</p>
          </div>
        )}

        {/* On-chain proof */}
        {onChainTx && (
          <div className="p-3 rounded-lg bg-success/10 border border-success/20">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-3.5 h-3.5 text-success" />
              <p className="text-xs text-success font-medium">On-Chain Proof</p>
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-mono text-text-primary">{truncateHash(onChainTx)}</p>
              {explorerUrl && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary-orange hover:underline"
                >
                  Explorer <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-5 pt-4 border-t border-white/5">
        <Button
          variant="secondary"
          size="small"
          onClick={handleShare}
          icon={Share2}
        >
          Share
        </Button>
        <Button
          variant="ghost"
          size="small"
          onClick={handleExport}
          icon={Download}
        >
          Export JSON
        </Button>
      </div>
    </div>
  );
}

export default QRReceipt;
