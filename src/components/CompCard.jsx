import { fmt } from '../lib/verdict.js';

export function CompCard({ comp, index }) {
  const ppsf = comp.sqft > 0 ? Math.round(comp.soldPrice / comp.sqft) : null;
  const tags = [
    comp.beds  !== '—' ? `${comp.beds} bd`  : null,
    comp.baths !== '—' ? `${comp.baths} ba` : null,
    comp.sqft  > 0     ? `${comp.sqft.toLocaleString()} sf` : null,
    ppsf               ? `${fmt(ppsf)}/sf` : null,
  ].filter(Boolean);

  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 8, padding: 16,
      animation: `fadeSlideUp 0.4s ease ${index * 0.08}s both`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontFamily: "'Instrument Serif', serif", color: 'var(--text)' }}>{comp.address}</div>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
            {comp.distance}{comp.daysAgo !== '—' ? ` · ${comp.daysAgo}d ago` : ''}
          </div>
        </div>
        <div style={{ fontSize: 16, fontFamily: "'Instrument Serif', serif", color: 'var(--green)' }}>{fmt(comp.soldPrice)}</div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {tags.map((t, i) => (
          <span key={i} style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: 'var(--muted)', background: 'var(--tag-bg)', padding: '2px 7px', borderRadius: 4 }}>{t}</span>
        ))}
        {comp.correlation != null && (
          <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: 'var(--accent)', background: 'rgba(96,165,250,0.08)', padding: '2px 7px', borderRadius: 4 }}>
            {Math.round(comp.correlation * 100)}% match
          </span>
        )}
      </div>
    </div>
  );
}

export function CompSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, animation: `skeletonPulse 1.4s ease ${i * 0.12}s infinite` }}>
          <div style={{ height: 13, width: '55%', background: 'var(--border)', borderRadius: 4, marginBottom: 8 }} />
          <div style={{ height: 10, width: '30%', background: 'var(--border)', borderRadius: 4, marginBottom: 12 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            {[48, 44, 64, 72].map((w, j) => <div key={j} style={{ height: 18, width: w, background: 'var(--border)', borderRadius: 4 }} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
