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
