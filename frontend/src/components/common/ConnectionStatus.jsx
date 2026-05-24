export default function ConnectionStatus({ isLive, lastUpdated }) {
  const statusColor = isLive ? '#00ff9d' : '#facc15'
  const label = isLive ? 'LIVE' : 'SIMULATED'
  const when = lastUpdated ? `Updated ${Math.round((Date.now() - lastUpdated.getTime()) / 1000)}s ago` : 'No data yet'

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem', padding: '0.55rem 0.9rem', borderRadius: 999, background: 'rgba(15, 23, 42, 0.88)', border: '1px solid rgba(148, 163, 184, 0.12)', fontSize: '0.82rem' }}>
      <span style={{ width: 10, height: 10, borderRadius: '999px', background: statusColor, boxShadow: `0 0 0 4px ${statusColor}22`, animation: isLive ? 'pulse 1.4s ease-in-out infinite' : 'none' }} />
      <div style={{ display: 'grid', gap: '0.08rem' }}>
        <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{label}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{when}</span>
      </div>
    </div>
  )
}
