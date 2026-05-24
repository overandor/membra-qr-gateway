import React, { useState, useCallback } from 'react';
import { Vote, Plus, Clock, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn, formatNumber } from '../../utils';
import { Button } from '../ui/Button.jsx';
import { StatusPill } from '../ui/StatusPill.jsx';
import { Modal } from '../ui/Modal.jsx';
import { useWalletContext } from '../../context/WalletContext.jsx';
import { voteOnProposal, proposeGovernanceAction } from '../../services/protocolService.js';

const STATUS_ICONS = {
  active: CheckCircle,
  passed: CheckCircle,
  failed: XCircle,
  pending: Clock,
  timelock: Clock,
};

const STATUS_ICON_COLORS = {
  active: 'text-primary-orange',
  passed: 'text-success',
  failed: 'text-danger',
  pending: 'text-text-muted',
  timelock: 'text-primary-gold',
};

function ProposalCard({ proposal, onVote, votingId }) {
  const [expanded, setExpanded] = useState(false);
  const StatusIcon = STATUS_ICONS[proposal.status] || Clock;
  const iconColor = STATUS_ICON_COLORS[proposal.status] || 'text-text-muted';
  const yesPercent = proposal.votesFor && proposal.votesTotal
    ? ((proposal.votesFor / proposal.votesTotal) * 100).toFixed(0)
    : 0;

  return (
    <div className="p-4 rounded-xl bg-background-100 border border-white/5">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <StatusIcon className={cn('w-4 h-4 flex-shrink-0', iconColor)} />
          <p className="text-sm font-medium text-text-primary truncate">{proposal.title}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusPill status={proposal.status || 'pending'} />
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1 rounded hover:bg-white/5 text-text-muted hover:text-text-primary transition-colors"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Vote bar */}
      {proposal.votesTotal > 0 && (
        <div className="mb-2">
          <div className="h-1.5 rounded-full bg-background-50 border border-white/5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-success to-primary-gold rounded-full"
              style={{ width: `${yesPercent}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-success">For: {formatNumber(proposal.votesFor || 0)}</span>
            <span className="text-xs text-danger">Against: {formatNumber(proposal.votesAgainst || 0)}</span>
          </div>
        </div>
      )}

      {expanded && (
        <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
          {proposal.description && (
            <p className="text-xs text-text-muted">{proposal.description}</p>
          )}
          {proposal.timelockEnd && (
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-primary-gold" />
              <p className="text-xs text-primary-gold">
                Timelock ends: {new Date(proposal.timelockEnd).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Vote buttons */}
      {proposal.status === 'active' && (
        <div className="flex gap-2 mt-3">
          <Button
            variant="success"
            size="small"
            onClick={() => onVote(proposal.id, 'for')}
            loading={votingId === `${proposal.id}_for`}
          >
            Vote For
          </Button>
          <Button
            variant="danger"
            size="small"
            onClick={() => onVote(proposal.id, 'against')}
            loading={votingId === `${proposal.id}_against`}
          >
            Vote Against
          </Button>
        </div>
      )}
    </div>
  );
}

export function GovernancePanel({ governanceState, loading, onRefresh, className }) {
  const { connected, publicKey } = useWalletContext();
  const [votingId, setVotingId] = useState(null);
  const [voteError, setVoteError] = useState(null);
  const [proposeOpen, setProposeOpen] = useState(false);
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalDesc, setProposalDesc] = useState('');
  const [proposing, setProposing] = useState(false);
  const [proposeError, setProposeError] = useState(null);

  const proposals = governanceState?.items || [];
  const total = governanceState?.total || 0;

  const handleVote = useCallback(async (proposalId, vote) => {
    if (!connected) return;
    setVoteError(null);
    const key = `${proposalId}_${vote}`;
    setVotingId(key);
    try {
      await voteOnProposal(proposalId, vote, publicKey);
      onRefresh?.();
    } catch (err) {
      setVoteError(err.message || 'Vote failed');
    } finally {
      setVotingId(null);
    }
  }, [connected, publicKey, onRefresh]);

  const handlePropose = useCallback(async () => {
    if (!proposalTitle.trim()) { setProposeError('Title is required'); return; }
    setProposing(true);
    setProposeError(null);
    try {
      await proposeGovernanceAction(publicKey, {
        title: proposalTitle.trim(),
        description: proposalDesc.trim(),
      });
      setProposalTitle('');
      setProposalDesc('');
      setProposeOpen(false);
      onRefresh?.();
    } catch (err) {
      setProposeError(err.message || 'Failed to create proposal');
    } finally {
      setProposing(false);
    }
  }, [publicKey, proposalTitle, proposalDesc, onRefresh]);

  return (
    <div className={cn('glass-card p-6', className)}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Vote className="w-5 h-5 text-primary-orange" />
          <h3 className="font-semibold">Governance</h3>
          {total > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-primary-orange/20 text-xs text-primary-orange font-medium">
              {total}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {connected && (
            <Button
              variant="secondary"
              size="small"
              onClick={() => setProposeOpen(true)}
              icon={Plus}
            >
              Propose
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary-orange/30 border-t-primary-orange rounded-full animate-spin" />
        </div>
      ) : proposals.length > 0 ? (
        <div className="space-y-3">
          {proposals.map((proposal, i) => (
            <ProposalCard
              key={proposal.id || i}
              proposal={proposal}
              onVote={handleVote}
              votingId={votingId}
            />
          ))}
          {voteError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-danger/10 border border-danger/20">
              <AlertTriangle className="w-4 h-4 text-danger" />
              <p className="text-xs text-danger">{voteError}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <Vote className="w-10 h-10 text-text-muted mx-auto mb-2" />
          <p className="text-sm text-text-muted">No proposals yet.</p>
          {connected && (
            <Button
              variant="secondary"
              size="small"
              className="mt-3"
              onClick={() => setProposeOpen(true)}
              icon={Plus}
            >
              Create First Proposal
            </Button>
          )}
        </div>
      )}

      {/* Propose modal */}
      <Modal
        open={proposeOpen}
        onClose={() => { setProposeOpen(false); setProposeError(null); }}
        title="Create Governance Proposal"
        size="medium"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setProposeOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handlePropose} loading={proposing} icon={Vote}>
              Submit Proposal
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Title</label>
            <input
              type="text"
              value={proposalTitle}
              onChange={(e) => setProposalTitle(e.target.value)}
              placeholder="Short proposal title"
              className="w-full px-3 py-2 rounded-xl bg-background-100 border border-white/10 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-orange/40"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Description</label>
            <textarea
              value={proposalDesc}
              onChange={(e) => setProposalDesc(e.target.value)}
              placeholder="Describe the proposed action…"
              rows={4}
              className="w-full px-3 py-2 rounded-xl bg-background-100 border border-white/10 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-orange/40 resize-none"
            />
          </div>
          {proposeError && (
            <p className="text-xs text-danger">{proposeError}</p>
          )}
        </div>
      </Modal>
    </div>
  );
}

export default GovernancePanel;
