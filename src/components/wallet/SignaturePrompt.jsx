import React, { useState, useCallback } from 'react';
import { Shield, AlertTriangle, FileText, Loader2, Check, X } from 'lucide-react';
import { cn } from '../../utils';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { useWalletContext } from '../../context/WalletContext.jsx';

export function SignaturePrompt({
  open,
  onClose,
  message,
  description,
  onSigned,
  onRejected,
  title = 'Sign Message',
}) {
  const { signMessage, publicKey, loading: walletLoading } = useWalletContext();
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState(null);
  const [signed, setSigned] = useState(false);

  const handleSign = useCallback(async () => {
    if (!message) return;
    setSigning(true);
    setError(null);
    try {
      const signature = await signMessage(message);
      setSigned(true);
      if (onSigned) await onSigned(signature, message);
      setTimeout(() => {
        setSigned(false);
        onClose?.();
      }, 800);
    } catch (err) {
      setError(err.message || 'Signing failed. Please try again.');
    } finally {
      setSigning(false);
    }
  }, [message, signMessage, onSigned, onClose]);

  const handleReject = useCallback(() => {
    setError(null);
    setSigned(false);
    if (onRejected) onRejected();
    onClose?.();
  }, [onRejected, onClose]);

  const isLoading = signing || walletLoading;

  return (
    <Modal
      open={open}
      onClose={handleReject}
      title={title}
      size="medium"
      footer={
        <div className="flex gap-3 justify-end">
          <Button
            variant="ghost"
            onClick={handleReject}
            disabled={isLoading}
            icon={X}
          >
            Reject
          </Button>
          <Button
            variant="primary"
            onClick={handleSign}
            loading={signing}
            disabled={isLoading || signed}
            icon={signed ? Check : Shield}
          >
            {signed ? 'Signed!' : 'Approve & Sign'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Wallet indicator */}
        {publicKey && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20">
            <div className="w-2 h-2 rounded-full bg-success" />
            <p className="text-xs text-success font-mono">
              {publicKey.slice(0, 8)}...{publicKey.slice(-6)}
            </p>
            <span className="text-xs text-text-muted ml-auto">Wallet connected</span>
          </div>
        )}

        {/* Description */}
        {description && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-background-100 border border-white/5">
            <FileText className="w-4 h-4 text-primary-orange mt-0.5 flex-shrink-0" />
            <p className="text-sm text-text-muted">{description}</p>
          </div>
        )}

        {/* Message to sign */}
        <div>
          <p className="text-xs text-text-muted mb-2 font-medium">Message to sign:</p>
          <div className="p-3 rounded-lg bg-background-100 border border-primary-orange/20 font-mono text-xs text-text-primary break-all max-h-40 overflow-y-auto scrollbar-thin">
            {message || '(no message)'}
          </div>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-primary-gold/10 border border-primary-gold/20">
          <AlertTriangle className="w-4 h-4 text-primary-gold mt-0.5 flex-shrink-0" />
          <p className="text-xs text-text-muted">
            Only sign messages from trusted sources. This signature proves your wallet controls this address without exposing your private key.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-danger/10 border border-danger/20">
            <AlertTriangle className="w-4 h-4 text-danger flex-shrink-0" />
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default SignaturePrompt;
