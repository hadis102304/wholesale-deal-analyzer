export function VerdictBadge({ verdict, color, icon, small = false }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: small ? 5 : 8 }}>
      <span style={{ color, fontSize: small ? 10 : 13 }}>{icon}</span>
      <span style={{
        fontFamily: "'DM Mono', monospace",
        fontSize:   small ? 9 : 11,
        letterSpacing: 2,
        color,
        fontWeight: 600,
      }}>
        {verdict}
      </span>
    </div>
  );
}
