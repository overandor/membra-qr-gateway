import React, { useState, useCallback } from 'react';
import { Coins, Lock, Unlock, Gift, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn, formatNumber, formatCurrency } from '../../utils';
import { Button } from '../ui/Button.jsx';
import { StatusPill } from '../ui/StatusPill.jsx';
import { useWalletContext } from '../../context/WalletContext.jsx';
import { stakeTokens, unstakeTokens, claimRewards } from '../../services/protocolService.js';

const LOCK_TIERS = [
  { days: 30, label: '30 Days', multiplier: '1.0x' },
  { days: 90, label: '90 Days', multiplier: '1.5x' },
  { days: 180, label: '180 Days', multiplier: '2.0x' },
  { days: 365, label: '365 Days', multiplier: '3.0x' },
];

export function RewardsPanel({ rewardsState, loading, onRefresh, className }) {
  const { connected, publicKey } = useWalletContext();
  const [stakeAmount, setStakeAmount] = useState('');
  const [lockTier, setLockTier] = useState(30);
  const [staking, setStaking] = useState(false);
  const [unstaking, setUnstaking] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  const {
    totalTVL = 0,
    userStake = 0,
    claimableRewards = 0,
    lockTier: currentLock,
    unlockTime,
  } = rewardsState || {};

  const clearMessages = () => { setActionError(null); setActionSuccess(null); };

  const handleStake = useCallback(async () => {
    const amount = parseFloat(stakeAmount);
    if (!amount || amount <= 0) { setActionError('Enter a valid stake amount'); return; }
    clearMessages();
    setStaking(true);
    try {
      await stakeTokens(publicKey, amount, lockTier);
      setActionSuccess(`Staked ${amount} MCHAT for ${lockTier} days`);
      setStakeAmount('');
      onRefresh?.();
    } catch (err) {
      setActionError(err.message || 'Stake failed');
    } finally {
      setStaking(false);
    }
  }, [publicKey, stakeAmount, lockTier, onRefresh]);

  const handleUnstake = useCallback(async () => {
    clearMessages();
    setUnstaking(true);
    try {
      await unstakeTokens(publicKey, userStake);
      setActionSuccess('Unstake initiated');
      onRefresh?.();
    } catch (err) {
      setActionError(err.message || 'Unstake failed');
    } finally {
      setUnstaking(false);
    }
  }, [publicKey, userStake, onRefresh]);

  const handleClaim = useCallback(async () => {
    clearMessages();
    setClaiming(true);
    try {
      await claimRewards(publicKey);
      setActionSuccess(`Claimed ${claimableRewards} MCHAT rewards`);
      onRefresh?.();
    } catch (err) {
      setActionError(err.message || 'Claim failed');
    } finally {
      setClaiming(false);
    }
  }, [publicKey, claimableRewards, onRefresh]);

  return (
    <div className={cn('glass-card p-6', className)}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-primary-orange" />
          <h3 className="font-semibold">Rewards & Staking</h3>
        </div>
        <StatusPill status={userStake > 0 ? 'active' : 'pending'} label={userStake > 0 ? 'Staking' : 'Not Staked'} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary-orange/30 border-t-primary-orange rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-background-100 border border-white/5 text-center">
              <p className="text-xs text-text-muted mb-1">Total TVL</p>
              <p className="text-sm font-bold text-primary-orange">{formatCurrency(totalTVL)}</p>
            </div>
            <div className="p-3 rounded-lg bg-background-100 border border-white/5 text-center">
              <p className="text-xs text-text-muted mb-1">Your Stake</p>
              <p className="text-sm font-bold text-primary-gold">{formatNumber(userStake)} MCHAT</p>
            </div>
            <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-center">
              <p className="text-xs text-text-muted mb-1">Claimable</p>
              <p className="text-sm font-bold text-success">{formatNumber(claimableRewards)} MCHAT</p>
            </div>
          </div>

          {/* Lock status */}
          {currentLock && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-background-100 border border-white/5">
              <Lock className="w-4 h-4 text-primary-gold" />
              <div>
                <p className="text-xs text-text-muted">Current Lock Tier</p>
                <p className="text-sm font-medium text-primary-gold">
                  {currentLock} days
                  {unlockTime && ` — unlocks ${new Date(unlockTime).toLocaleDateString()}`}
                </p>
              </div>
            </div>
          )}

          {connected ? (
            <div className="space-y-4">
              {/* Stake form */}
              <div className="p-4 rounded-xl bg-background-100 border border-primary-orange/20">
                <p className="text-sm font-medium mb-3">Stake MCHAT</p>

                {/* Lock tier selector */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {LOCK_TIERS.map((tier) => (
                    <button
                      key={tier.days}
                      onClick={() => setLockTier(tier.days)}
                      className={cn(
                        'p-2 rounded-lg border text-xs font-medium transition-colors',
                        lockTier === tier.days
                          ? 'bg-primary-orange/20 border-primary-orange/40 text-primary-orange'
                          : 'bg-background-50 border-white/10 text-text-muted hover:border-primary-orange/20'
                      )}
                    >
                      <div>{tier.label}</div>
                      <div className="text-primary-gold">{tier.multiplier}</div>
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    placeholder="MCHAT amount"
                    className="flex-1 px-3 py-2 rounded-xl bg-background-50 border border-white/10 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-orange/40"
                  />
                  <Button
                    variant="primary"
                    size="medium"
                    onClick={handleStake}
                    loading={staking}
                    icon={Lock}
                  >
                    Stake
                  </Button>
                </div>
              </div>

              {/* Unstake & Claim */}
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="medium"
                  onClick={handleUnstake}
                  loading={unstaking}
                  disabled={!userStake}
                  icon={Unlock}
                >
                  Unstake
                </Button>
                <Button
                  variant="primary"
                  size="medium"
                  onClick={handleClaim}
                  loading={claiming}
                  disabled={claimableRewards <= 0}
                  icon={Gift}
                >
                  Claim {formatNumber(claimableRewards)} MCHAT
                </Button>
              </div>

              {/* Messages */}
              {actionError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-danger/10 border border-danger/20">
                  <AlertTriangle className="w-4 h-4 text-danger" />
                  <p className="text-xs text-danger">{actionError}</p>
                </div>
              )}
              {actionSuccess && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <p className="text-xs text-success">{actionSuccess}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-background-100 border border-white/5 text-center">
              <p className="text-sm text-text-muted">Connect your wallet to stake and claim rewards.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RewardsPanel;
