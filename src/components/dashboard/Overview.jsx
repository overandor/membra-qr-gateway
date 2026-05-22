import React, { useState, useEffect } from 'react';
import {
  Activity, Box, TrendingUp, Cpu, Zap, Clock, ArrowRight, AlertTriangle
} from 'lucide-react';
import { api } from '../../services/api';

export function Overview() {
  const [health, setHealth] = useState(null);
  const [artifactCount, setArtifactCount] = useState(0);
  const [eventCount, setEventCount] = useState(0);
  const [recentEvents, setRecentEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [h, ev] = await Promise.all([
          api.health().catch(() => null),
          api.getEvents().catch(() => ({ events: [] })),
        ]);
        if (cancelled) return;
        setHealth(h);
        const events = ev.events || ev || [];
        setEventCount(events.length);
        setRecentEvents(events.slice(0, 5));
        const artEvents = events.filter((e) => e.event_type?.includes('artifact') || e.subject_type === 'artifact');
        setArtifactCount(artEvents.length);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const t = setInterval(load, 15000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  const cards = [
    { label: 'Backend Status', value: health ? 'Online' : 'Offline', icon: Activity, color: health ? 'text-[var(--accent-success)]' : 'text-[var(--accent-danger)]', status: health ? 'online' : 'offline' },
    { label: 'Artifacts', value: artifactCount, icon: Box, color: 'text-[var(--accent-orange)]', status: 'online' },
    { label: 'Events', value: eventCount, icon: TrendingUp, color: 'text-[var(--accent-gold)]', status: 'warning' },
    { label: 'LLM Engine', value: 'Ready', icon: Cpu, color: 'text-[var(--accent-success)]', status: 'online' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="neo-card p-5">
            <div className="flex items-center justify-between mb-3">
              <card.icon className={`w-5 h-5 ${card.color}`} />
              <div className={`status-dot ${card.status}`} />
            </div>
            <p className="text-[10px] text-[var(--text-muted)] uppercase-tracking">{card.label}</p>
            <p className="text-2xl font-bold mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="neo-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-[var(--accent-orange)]" />
          Recent Activity
        </h3>
        {recentEvents.length === 0 ? (
          <div className="neo-card-pressed p-8 text-center">
            <AlertTriangle className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
            <p className="text-sm text-[var(--text-muted)]">No events yet. Create an artifact or token sale to see activity.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentEvents.map((ev, i) => (
              <div key={i} className="neo-card-pressed p-3 rounded-lg flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <div className="neo-elevated w-8 h-8 rounded-lg flex items-center justify-center">
                    <Zap className="w-4 h-4 text-[var(--accent-orange)]" />
                  </div>
                  <div>
                    <p className="font-medium">{ev.event_type || ev.subject_type || 'Event'}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">{ev.subject_id?.slice(0, 16) || '—'}</p>
                  </div>
                </div>
                <span className="text-[11px] text-[var(--text-muted)]">{ev.created_at?.slice(0, 16) || ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Create Artifact', desc: 'Photo → QR → On-chain proof', icon: Box, color: 'from-[var(--accent-orange)] to-[var(--accent-gold)]' },
          { label: 'Start Token Sale', desc: 'Launch bonding curve IDO', icon: TrendingUp, color: 'from-[var(--accent-gold)] to-[var(--accent-bronze)]' },
          { label: 'LLM Analysis', desc: 'AI-powered artifact insights', icon: Cpu, color: 'from-[var(--accent-success)] to-[var(--accent-gold)]' },
        ].map((action) => (
          <div key={action.label} className="neo-card p-5 group cursor-pointer hover:border-[var(--accent-orange)]/20 transition-all">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
              <action.icon className="w-5 h-5 text-black" />
            </div>
            <h4 className="font-semibold text-sm">{action.label}</h4>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">{action.desc}</p>
            <ArrowRight className="w-4 h-4 text-[var(--text-muted)] mt-3 group-hover:text-[var(--accent-orange)] group-hover:translate-x-1 transition-all" />
          </div>
        ))}
      </div>
    </div>
  );
}
