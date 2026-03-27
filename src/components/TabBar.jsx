export function TabBar({ active, onChange, pendingCount }) {
  const tabs = [
    { id: 'analyze', label: 'Analyze' },
    { id: 'leads',   label: 'Leads', badge: pendingCount > 0 ? pendingCount : null },
  ];

  return (
    <div style={{ display: 'flex', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, marginBottom: 24 }}>
      {tabs.map(({ id, label, badge }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          style={{
            flex: 1, padding: '9px 0', borderRadius: 7, border: 'none',
            background: active === id ? 'var(--card-elevated)' : 'transparent',
            color: active === id ? 'var(--text)' : 'var(--muted)',
            fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: 1.5,
            textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s',
            position: 'relative',
          }}
        >
          {label}
          {badge != null && (
            <span style={{
              position: 'absolute', top: 4, right: 'calc(50% - 28px)',
              background: '#f59e0b', color: '#0c0f14', borderRadius: '50%',
              width: 14, height: 14, fontSize: 8, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
