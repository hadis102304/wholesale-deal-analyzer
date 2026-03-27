import { useState, useRef, useCallback, useEffect } from 'react';
import { useNetworkStatus }  from './hooks/useNetworkStatus.js';
import { useGooglePlaces }   from './hooks/useGooglePlaces.js';
import { fetchComps }        from './lib/rentcast.js';
import { getVerdict, fmt }   from './lib/verdict.js';
import { queueLength }       from './lib/offlineQueue.js';
import { flushOfflineQueue } from './lib/offlineQueue.js';

import { OfflineBanner }   from './components/OfflineBanner.jsx';
import { AnimatedNumber }  from './components/AnimatedNumber.jsx';
import { Slider }          from './components/Slider.jsx';
import { VerdictBadge }    from './components/VerdictBadge.jsx';
import { CompCard, CompSkeleton } from './components/CompCard.jsx';
import { SaveDealButton }  from './components/SaveDealButton.jsx';
import { TabBar }          from './components/TabBar.jsx';
import { LeadsDashboard }  from './components/LeadsDashboard.jsx';

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
    navigator.serviceWorker.addEventListener('message', (e) => {
      if (e.data?.type === 'FLUSH_QUEUE') flushOfflineQueue();
    });
  });
}

const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Instrument+Serif:ital@0;1&display=swap');

  :root {
    --bg:           #0c0f14;
    --card:         #12161d;
    --card-elevated:#181d26;
    --border:       #1e2530;
    --text:         #e8eaed;
    --muted:        #6b7280;
    --accent:       #60a5fa;
    --green:        #4ade80;
    --amber:        #fbbf24;
    --red:          #f87171;
    --track:        #1e2530;
    --tag-bg:       #1a1f28;
  }

  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: var(--bg); color: var(--text); overscroll-behavior: none; }

  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%;
    background: var(--text); border: 2px solid var(--bg);
    box-shadow: 0 0 8px rgba(96,165,250,0.3); cursor: pointer;
  }
  input[type="range"]::-moz-range-thumb {
    width: 16px; height: 16px; border-radius: 50%; border: 2px solid var(--bg);
    background: var(--text); box-shadow: 0 0 8px rgba(96,165,250,0.3); cursor: pointer;
  }

  /* Google Places dropdown skin */
  .pac-container {
    background: var(--card-elevated) !important;
    border: 1px solid var(--border) !important;
    border-radius: 8px !important;
    margin-top: 4px !important;
    font-family: 'DM Mono', monospace !important;
    box-shadow: 0 8px 24px rgba(0,0,0,0.5) !important;
  }
  .pac-item {
    color: var(--muted) !important; border-top: 1px solid var(--border) !important;
    padding: 8px 14px !important; font-size: 12px !important; cursor: pointer !important;
  }
  .pac-item:hover, .pac-item-selected { background: var(--card) !important; }
  .pac-item-query { color: var(--text) !important; font-size: 13px !important; }
  .pac-matched    { color: var(--accent) !important; }
  .pac-icon       { display: none !important; }

  @keyframes fadeSlideUp   { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pulseGlow     { 0%,100% { box-shadow: 0 0 20px rgba(96,165,250,0.08); } 50% { box-shadow: 0 0 30px rgba(96,165,250,0.18); } }
  @keyframes barGrow       { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  @keyframes skeletonPulse { 0%,100% { opacity: 0.35; } 50% { opacity: 0.9; } }
  @keyframes spin          { to { transform: rotate(360deg); } }
`;

export default function App() {
  const { isOnline }   = useNetworkStatus();
  const [tab, setTab]  = useState('analyze');

  // ── Analyze state ──────────────────────────────────────────────────────────
  const [address,  setAddress]  = useState('');
  const [analyzed, setAnalyzed] = useState(false);
  const [arv,      setArv]      = useState(250000);
  const [repairs,  setRepairs]  = useState(35000);
  const [fee,      setFee]      = useState(10000);

  // ── Comps state ────────────────────────────────────────────────────────────
  const [comps,       setComps]       = useState([]);
  const [compsStatus, setCompsStatus] = useState('idle'); // idle|loading|success|error
  const [compsError,  setCompsError]  = useState(null);
  const [avgComp,     setAvgComp]     = useState(null);
  const [avm,         setAvm]         = useState(null);

  // ── Local leads cache (for current session before Supabase confirms) ───────
  const [localLeads, setLocalLeads] = useState([]);

  const inputRef        = useRef(null);
  const onPlaceSelected = useCallback((place) => setAddress(place), []);
  useGooglePlaces(inputRef, onPlaceSelected);

  // ── Derived ────────────────────────────────────────────────────────────────
  const mao      = Math.round(arv * 0.7 - repairs - fee);
  const profit70 = Math.round(arv * 0.3);
  const { verdict, color: verdictColor, icon: verdictIcon } = getVerdict(mao, arv);
  const pending  = queueLength();

  // ── Analyze ────────────────────────────────────────────────────────────────
  const handleAnalyze = useCallback(async () => {
    if (!address.trim()) return;
    setAnalyzed(true);
    setCompsStatus('loading');
    setCompsError(null);
    setComps([]);
    setAvgComp(null);
    setAvm(null);

    if (!isOnline) {
      setCompsStatus('error');
      setCompsError('You\'re offline — adjust sliders manually until you\'re back in range.');
      return;
    }

    try {
      const result = await fetchComps(address.trim());
      setComps(result.comps);
      setAvm(result.avm);

      const prices = result.comps.filter((c) => c.soldPrice > 0).map((c) => c.soldPrice);
      if (prices.length) {
        const avg  = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length);
        setAvgComp(avg);
        const seed = result.avm ?? avg;
        setArv(Math.min(800_000, Math.max(50_000, seed)));
      }
      setCompsStatus('success');
    } catch (err) {
      setCompsError(err.message ?? 'Failed to load comps');
      setCompsStatus('error');
    }
  }, [address, isOnline]);

  // ── Deal payload for saving ────────────────────────────────────────────────
  const dealPayload = {
    address,
    arv,
    repairs,
    fee,
    mao,
    verdict,
    avm,
    comps: comps.map(({ address, beds, baths, sqft, soldPrice }) => ({ address, beds, baths, sqft, soldPrice })),
  };

  // ── Spinner helper ─────────────────────────────────────────────────────────
  const Spinner = () => (
    <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
  );

  return (
    <>
      <style>{GLOBAL_STYLES}</style>
      {!isOnline && <OfflineBanner />}

      <div style={{
        minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)',
        padding: `${!isOnline ? 64 : 28}px 20px 52px`,
        fontFamily: "'DM Mono', monospace",
      }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>

          {/* ── Header ── */}
          <div style={{ marginBottom: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 10, letterSpacing: 4, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>Wholesale</div>
            <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 32, fontWeight: 400, letterSpacing: -0.5, color: 'var(--text)' }}>
              Deal Analyzer
            </h1>
            <div style={{ width: 40, height: 1, background: 'var(--accent)', margin: '12px auto 0', opacity: 0.6 }} />
          </div>

          {/* ── Tab Bar ── */}
          <TabBar active={tab} onChange={setTab} pendingCount={pending} />

          {/* ══════════════ ANALYZE TAB ══════════════ */}
          {tab === 'analyze' && (
            <>
              {/* Address input */}
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 24 }}>
                <label style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: 8 }}>
                  Property Address
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    ref={inputRef}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                    placeholder="e.g. 1920 Westfield Blvd, Detroit MI"
                    autoComplete="off"
                    style={{
                      flex: 1, background: 'var(--card-elevated)', border: '1px solid var(--border)',
                      borderRadius: 6, padding: '10px 14px', color: 'var(--text)',
                      fontSize: 13, fontFamily: "'DM Mono', monospace",
                      outline: 'none', transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={(e)  => (e.target.style.borderColor = 'var(--border)')}
                  />
                  <button
                    onClick={handleAnalyze}
                    disabled={!address.trim() || compsStatus === 'loading'}
                    style={{
                      background: address.trim() && compsStatus !== 'loading' ? 'var(--accent)' : 'var(--border)',
                      color:      address.trim() && compsStatus !== 'loading' ? '#0c0f14' : 'var(--muted)',
                      border: 'none', borderRadius: 6, padding: '10px 20px', minWidth: 90,
                      fontSize: 11, fontFamily: "'DM Mono', monospace", fontWeight: 500,
                      letterSpacing: 1, textTransform: 'uppercase',
                      cursor: address.trim() && compsStatus !== 'loading' ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s',
                    }}
                  >
                    {compsStatus === 'loading' ? <Spinner /> : 'Analyze'}
                  </button>
                </div>
              </div>

              {analyzed && (
                <div style={{ animation: 'fadeSlideUp 0.5s ease both' }}>

                  {/* MAO Card */}
                  <div style={{
                    background: 'var(--card)',
                    border: `1px solid ${mao > 0 ? 'rgba(96,165,250,0.2)' : 'rgba(248,113,113,0.2)'}`,
                    borderRadius: 12, padding: 24, marginBottom: 24, textAlign: 'center',
                    animation: 'pulseGlow 3s ease-in-out infinite',
                  }}>
                    <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
                      Maximum Allowable Offer
                    </div>
                    <div style={{ fontSize: 44, fontFamily: "'Instrument Serif', serif", fontWeight: 400, color: mao > 0 ? 'var(--accent)' : 'var(--red)', lineHeight: 1.1 }}>
                      <AnimatedNumber value={Math.max(mao, 0)} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
                      <VerdictBadge verdict={verdict} color={verdictColor} icon={verdictIcon} />
                    </div>

                    {avm && (
                      <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 6, padding: '4px 12px' }}>
                        <span style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--muted)', textTransform: 'uppercase' }}>RentCast AVM</span>
                        <span style={{ fontSize: 13, color: 'var(--green)', fontFamily: "'Instrument Serif', serif" }}>{fmt(avm)}</span>
                      </div>
                    )}

                    {/* Formula breakdown */}
                    <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--card-elevated)', borderRadius: 8, fontSize: 11, color: 'var(--muted)', lineHeight: 1.9, textAlign: 'left' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>ARV × 70%</span>
                        <span style={{ color: 'var(--green)' }}>{fmt(Math.round(arv * 0.7))}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>− Repairs</span>
                        <span style={{ color: 'var(--red)' }}>({fmt(repairs)})</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>− Wholesale Fee</span>
                        <span style={{ color: 'var(--red)' }}>({fmt(fee)})</span>
                      </div>
                      <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text)', fontWeight: 500 }}>
                        <span>= MAO</span>
                        <span>{fmt(Math.max(mao, 0))}</span>
                      </div>
                    </div>

                    {/* Save button */}
                    <SaveDealButton
                      deal={dealPayload}
                      isOnline={isOnline}
                      onSaved={(saved) => {
                        setLocalLeads((prev) => prev.some((l) => l.id === saved.id) ? prev : [saved, ...prev]);
                      }}
                    />
                  </div>

                  {/* Waterfall */}
                  <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, marginBottom: 24 }}>
                    <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 14 }}>Deal Waterfall</div>
                    <div style={{ display: 'flex', height: 28, borderRadius: 6, overflow: 'hidden', animation: 'barGrow 0.8s ease both', transformOrigin: 'left' }}>
                      {arv > 0 && (
                        <>
                          <div style={{ width: `${(Math.max(mao, 0) / arv) * 100}%`, background: 'var(--accent)', transition: 'width 0.3s' }} title={`MAO: ${fmt(Math.max(mao, 0))}`} />
                          <div style={{ width: `${(repairs / arv) * 100}%`, background: '#f97316', transition: 'width 0.3s' }} title={`Repairs: ${fmt(repairs)}`} />
                          <div style={{ width: `${(fee / arv) * 100}%`, background: 'var(--amber)', transition: 'width 0.3s' }} title={`Fee: ${fmt(fee)}`} />
                          <div style={{ flex: 1, background: 'var(--green)' }} title={`Margin: ${fmt(profit70)}`} />
                        </>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, flexWrap: 'wrap', gap: 8 }}>
                      {[
                        { label: 'MAO',        color: 'var(--accent)' },
                        { label: 'Repairs',    color: '#f97316' },
                        { label: 'Fee',        color: 'var(--amber)' },
                        { label: 'Margin 30%', color: 'var(--green)' },
                      ].map(({ label, color }) => (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
                          <span style={{ fontSize: 10, color: 'var(--muted)' }}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sliders */}
                  <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                      <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--muted)' }}>Adjust Parameters</div>
                      {avgComp && (
                        <button
                          onClick={() => setArv(Math.min(800000, Math.max(50000, avgComp)))}
                          style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', background: 'rgba(96,165,250,0.1)', color: 'var(--accent)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontFamily: "'DM Mono', monospace" }}
                        >
                          Reset ARV to avg comp
                        </button>
                      )}
                    </div>
                    <Slider label="After Repair Value" value={arv}     onChange={setArv}     min={50000} max={800000} step={5000} color="var(--accent)" />
                    <Slider label="Estimated Repairs"  value={repairs} onChange={setRepairs} min={0}     max={150000} step={1000} color="#f97316" />
                    <Slider label="Wholesale Fee"      value={fee}     onChange={setFee}     min={2000}  max={30000}  step={500}  color="var(--amber)" />
                  </div>

                  {/* Comps */}
                  <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--muted)' }}>Comparable Sales</div>
                      <span style={{
                        fontSize: 9, fontFamily: "'DM Mono', monospace", padding: '3px 8px', borderRadius: 4, letterSpacing: 1,
                        ...(compsStatus === 'success'
                          ? { background: 'rgba(74,222,128,0.1)',   color: 'var(--green)' }
                          : compsStatus === 'error'
                          ? { background: 'rgba(248,113,113,0.1)', color: 'var(--red)' }
                          : { background: 'rgba(96,165,250,0.1)',  color: 'var(--accent)' }),
                      }}>
                        {compsStatus === 'success' ? 'RENTCAST LIVE' : compsStatus === 'error' ? 'ERROR' : 'LOADING…'}
                      </span>
                    </div>

                    {compsStatus === 'loading' && <CompSkeleton />}

                    {compsStatus === 'error' && (
                      <div style={{ padding: 16, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8, fontSize: 11, color: 'var(--red)', lineHeight: 1.6 }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>Could not load comps</div>
                        <div style={{ color: 'var(--muted)', fontSize: 10 }}>{compsError}</div>
                      </div>
                    )}

                    {compsStatus === 'success' && comps.length === 0 && (
                      <div style={{ padding: 16, fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
                        No recent comps found for this address.
                      </div>
                    )}

                    {compsStatus === 'success' && comps.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {comps.map((c, i) => <CompCard key={i} comp={c} index={i} />)}
                      </div>
                    )}

                    {(avgComp || avm) && compsStatus === 'success' && (
                      <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--card-elevated)', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        {avgComp && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flex: 1, minWidth: 140 }}>
                            <span style={{ fontSize: 11, color: 'var(--muted)' }}>Avg Comp Price</span>
                            <span style={{ fontSize: 16, fontFamily: "'Instrument Serif', serif", color: 'var(--green)' }}>{fmt(avgComp)}</span>
                          </div>
                        )}
                        {avm && avgComp && <div style={{ width: 1, height: 28, background: 'var(--border)' }} />}
                        {avm && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flex: 1, minWidth: 140 }}>
                            <span style={{ fontSize: 11, color: 'var(--muted)' }}>RentCast AVM</span>
                            <span style={{ fontSize: 16, fontFamily: "'Instrument Serif', serif", color: 'var(--accent)' }}>{fmt(avm)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: 'center', marginTop: 24, paddingBottom: 4 }}>
                    <div style={{ fontSize: 9, letterSpacing: 2, color: 'var(--muted)', textTransform: 'uppercase' }}>Formula: (ARV × 0.70) − Repairs − Fee = MAO</div>
                    <div style={{ marginTop: 4, fontSize: 9, color: 'var(--border)', letterSpacing: 1 }}>Comps powered by RentCast</div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ══════════════ LEADS TAB ══════════════ */}
          {tab === 'leads' && <LeadsDashboard localLeads={localLeads} />}

        </div>
      </div>
    </>
  );
}
