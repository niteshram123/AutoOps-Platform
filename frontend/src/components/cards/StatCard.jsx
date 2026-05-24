
export default function StatCard({ label, value, unit = '', accent = '#38bdf8', delta, deltaPositive = true, icon }) {
  return (
    <div className="card" style={{ padding: '1.35rem 1.35rem 1.6rem', borderTop: `3px solid ${accent}`, minWidth: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', overflow: 'hidden', minWidth: 0 }}>
        <div style={{ minWidth: 0, overflow: 'hidden' }}>
          <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.4rem', flexWrap: 'wrap', minWidth: 0, overflow: 'hidden' }}>
            <span
              className="metric-value"
              style={{
                fontSize: 28,
                fontWeight: 900,
                letterSpacing: '-0.04em',
                color: accent,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '100%',
                display: 'block',
                lineHeight: 1,
              }}
            >
              {value}
            </span>
            {unit && <span style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '0.2rem', whiteSpace: 'nowrap' }}>{unit}</span>}
          </div>
        </div>
        {icon ? <div style={{ fontSize: '1.35rem', minWidth: 0, overflow: 'hidden' }}>{icon}</div> : null}
      </div>
      {delta !== undefined && (
        <div style={{ marginTop: '1rem', color: deltaPositive ? 'var(--accent-green)' : 'var(--danger)', fontSize: '0.9rem' }}>
          {deltaPositive ? '▲' : '▼'} {delta}% from last cycle
        </div>
      )}
    </div>
  )
}
