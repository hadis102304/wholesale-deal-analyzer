export function OfflineBanner() {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 999,
      background: '#f59e0b', color: '#0c0f14',
      padding: '9px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: 1,
      textTransform: 'uppercase',
    }}>
      <span style={{ fontSize: 15 }}>⚡</span>
      No connection — saves queued locally, will sync when back online
    </div>
  );
}
