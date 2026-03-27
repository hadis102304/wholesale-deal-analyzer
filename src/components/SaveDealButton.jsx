import { useState } from 'react';
import { saveDeal } from '../lib/supabase.js';
import { enqueueOffline } from '../lib/offlineQueue.js';

const STYLES = {
  idle:   { bg: 'rgba(96,165,250,0.12)',  fg: 'var(--accent)', bd: 'rgba(96,165,250,0.25)' },
  saving: { bg: 'rgba(96,165,250,0.06)',  fg: 'var(--muted)',  bd: 'var(--border)' },
  saved:  { bg: 'rgba(74,222,128,0.12)',  fg: 'var(--green)',  bd: 'rgba(74,222,128,0.25)' },
  queued: { bg: 'rgba(245,158,11,0.12)',  fg: '#f59e0b',       bd: 'rgba(245,158,11,0.25)' },
  error:  { bg: 'rgba(248,113,113,0.12)', fg: 'var(--red)',    bd: 'rgba(248,113,113,0.25)' },
};

const LABELS = {
  idle:   'Save Deal',
  saving: 'Saving…',
  saved:  '✓ Saved',
  queued: '⚡ Queued',
  error:  'Retry Save',
};

export function SaveDealButton({ deal, isOnline, onSaved }) {
  const [status, setStatus] = useState('idle');

  const handleSave = async () => {
    if (status === 'saving' || status === 'saved') return;
    setStatus('saving');

    if (!isOnline) {
      enqueueOffline(deal);
      setStatus('queued');
      onSaved?.({ ...deal, id: `local_${Date.now()}`, created_at: new Date().toISOString(), _local: true });
      return;
    }

    const { data, error } = await saveDeal(deal);
    if (error) {
      enqueueOffline(deal);
      setStatus('queued');
      onSaved?.({ ...deal, id: `local_${Date.now()}`, created_at: new Date().toISOString(), _local: true });
    } else {
      setStatus('saved');
      onSaved?.(data);
    }
  };

  const s = STYLES[status];

  return (
    <button
      onClick={handleSave}
      disabled={status === 'saving' || status === 'saved'}
      style={{
        width: '100%', padding: '13px 0', marginTop: 16,
        background: s.bg, border: `1px solid ${s.bd}`, color: s.fg,
        borderRadius: 8, fontFamily: "'DM Mono', monospace",
        fontSize: 11, letterSpacing: 2, textTransform: 'uppercase',
        cursor: (status === 'saving' || status === 'saved') ? 'default' : 'pointer',
        transition: 'all 0.25s',
      }}
    >
      {LABELS[status]}
      {status === 'queued' && (
        <div style={{ fontSize: 9, marginTop: 3, opacity: 0.7, letterSpacing: 1 }}>
          Will sync when back online
        </div>
      )}
    </button>
  );
}
