import { fmt } from '../lib/verdict.js';

export function Slider({ label, value, onChange, min, max, step, color }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--muted)' }}>{label}</span>
        <span style={{ fontSize: 22, fontFamily: "'Instrument Serif', serif", fontWeight: 400, color }}>{fmt(value)}</span>
      </div>
      <div style={{ position: 'relative', height: 6, background: 'var(--track)', borderRadius: 3 }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.1s' }} />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ position: 'absolute', top: -8, left: 0, width: '100%', height: 22, appearance: 'none', WebkitAppearance: 'none', background: 'transparent', cursor: 'pointer', zIndex: 2 }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: "'DM Mono', monospace" }}>{fmt(min)}</span>
        <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: "'DM Mono', monospace" }}>{fmt(max)}</span>
      </div>
    </div>
  );
}
