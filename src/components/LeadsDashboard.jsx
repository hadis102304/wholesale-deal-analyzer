import { useState, useEffect } from 'react';
import { fetchDeals } from '../lib/supabase.js';
import { queueLength } from '../lib/offlineQueue.js';
import { getVerdict, fmt, fmtDay, VERDICT_ORDER } from '../lib/verdict.js';
import { VerdictBadge } from './VerdictBadge.jsx';

function DashSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ height: 76, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, animation: `skeletonPulse 1.4s ease ${i * 0.1}s infinite` }} />
      ))}
    </div>
  );
}

export function LeadsDashboard({ localLeads }) {
  const [deals,    setDeals]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [expanded, setExpanded] = useState(null);
  const pending = queueLength();

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await fetchDeals();
      setError(error?.message ?? null);
      setDeals(data ?? []);
      setLoading(false);
    })();
  }, []);

  // Merge remote + local; avoid duplicates
  const remoteIds = new Set(deals.map((d) => d.id));
  const merged    = [...localLeads.filter((l) => !remoteIds.has(l.id)), ...deals];

  const sorted = [...merged].sort((a, b) => {
    const ao = VERDICT_ORDER[a.verdict] ?? 99;
    const bo = VERDICT_ORDER[b.verdict] ?? 99;
    return ao !== bo ? ao - bo : new Date(b.created_at) - new Date(a.created_at);
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 4, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 2 }}>Saved</div>
          <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 26, fontWeight: 400 }}>Lead History</div>
        </div>
        {pending > 0 && (
          <div style={{ fontSize: 9, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b', borderRadius: 6, padding: '4px 10px', letterSpacing: 1, textTransform: 'uppercase' }}>
            ⚡ {pending} pending
          </div>
        )}
      </div>

      {loading && <DashSkeleton />}

      {!loading && error && (
        <div style={{ padding: 16, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8, fontSize: 11, color: 'var(--red)' }}>
          Could not load leads: {error}
        </div>
      )}

      {!loading && sorted.length === 0 && (
        <div style={{ textAlign: 'center', padding: '52px 0', color: 'var(--muted)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 12 }}>No saved deals yet.</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>Analyze a property and hit Save Deal.</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sorted.map((deal, i) => {
          const { verdict, color, icon } = getVerdict(deal.mao, deal.arv);
          const isOpen  = expanded === deal.id;
          const comps   = deal.comps ?? [];

          return (
            <div
              key={deal.id}
              onClick={() => setExpanded(isOpen ? null : deal.id)}
              style={{
                background: 'var(--card)',
                border: `1px solid ${isOpen ? 'rgba(96,165,250,0.2)' : 'var(--border)'}`,
                borderRadius: 10, padding: 16, cursor: 'pointer',
                transition: 'border-color 0.2s',
                animation: `fadeSlideUp 0.35s ease ${i * 0.05}s both`,
              }}
            >
              {/* Summary row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontFamily: "'Instrument Serif', serif", color: 'var(--text)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {deal.address}
                    {deal._local && <span style={{ fontSize: 9, color: '#f59e0b', marginLeft: 6 }}>LOCAL</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <VerdictBadge verdict={verdict} color={color} icon={icon} small />
                    <span style={{ fontSize: 9, color: 'var(--muted)', fontFamily: "'DM Mono', monospace" }}>
                      {deal.created_at ? fmtDay(deal.created_at) : ''}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', marginLeft: 12 }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: "'DM Mono', monospace", marginBottom: 2 }}>MAO</div>
                  <div style={{ fontSize: 20, fontFamily: "'Instrument Serif', serif", color: deal.mao > 0 ? 'var(--accent)' : 'var(--red)' }}>
                    {fmt(Math.max(deal.mao, 0))}
                  </div>
                </div>
              </div>

              {/* Expanded details */}
              {isOpen && (
                <div
                  style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 14 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                    {[
                      { label: 'ARV',     val: fmt(deal.arv) },
                      { label: 'Repairs', val: fmt(deal.repairs) },
                      { label: 'Fee',     val: fmt(deal.fee) },
                    ].map(({ label, val }) => (
                      <div key={label} style={{ background: 'var(--card-elevated)', borderRadius: 6, padding: '8px 10px' }}>
                        <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
                        <div style={{ fontSize: 14, fontFamily: "'Instrument Serif', serif", color: 'var(--text)' }}>{val}</div>
                      </div>
                    ))}
                  </div>

                  {deal.avm && (
                    <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: 6, padding: '6px 12px' }}>
                      <span style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1.5 }}>RentCast AVM at time of analysis</span>
                      <span style={{ fontSize: 13, fontFamily: "'Instrument Serif', serif", color: 'var(--green)' }}>{fmt(deal.avm)}</span>
                    </div>
                  )}

                  {comps.length > 0 && (
                    <>
                      <div style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Comps at time of analysis</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                        {comps.map((c, ci) => (
                          <div key={ci} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', padding: '6px 0', borderBottom: ci < comps.length - 1 ? '1px solid var(--border)' : 'none' }}>
                            <span>{c.address}</span>
                            <span style={{ color: 'var(--green)' }}>{fmt(c.soldPrice)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
