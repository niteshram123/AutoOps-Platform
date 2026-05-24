import { formatCPU, formatErrorRate, formatLatency, formatMemory, formatRPS } from '../../utils/format'
import MiniBar from '../charts/MiniBar.jsx'
import SparkLine from '../charts/SparkLine.jsx'
import StatusBadge from '../common/StatusBadge.jsx'

export default function ServiceCard({ service, metrics = {}, compact = false }) {
  const { rps = 0, errorRate = 0, p95 = 0, cpu = 0, mem = 0, health = 'healthy' } = metrics

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: `1px solid ${service.color}33`,
        borderTop: `2px solid ${service.color}`,
        borderRadius: 'var(--radius-md)',
        padding: compact ? '12px' : '16px',
        overflow: 'hidden',
        minWidth: 0,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 12,
          gap: 8,
          overflow: 'hidden',
        }}
      >
        <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 13,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {service.name.toUpperCase()}
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {service.lang}
          </div>
        </div>
        <StatusBadge status={health} />
      </div>

      <div
        className="metric-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
          marginBottom: 12,
          overflow: 'hidden',
        }}
      >
        {[
          { label: 'RPS', value: formatRPS(rps) },
          { label: 'ERR', value: formatErrorRate(errorRate) },
          { label: 'P95', value: formatLatency(p95) },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              background: 'var(--bg-base)',
              borderRadius: 6,
              padding: '8px 10px',
              overflow: 'hidden',
              minWidth: 0,
              maxWidth: '100%',
            }}
          >
            <div
              style={{
                fontSize: 9,
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.08em',
                marginBottom: 3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </div>
            <div
              className="metric-value"
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '100%',
                display: 'block',
                lineHeight: 1,
              }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      {!compact && (
        <div style={{ marginBottom: 12, overflow: 'hidden' }}>
          <SparkLine data={metrics.history || []} color={service.color} height={44} fill />
        </div>
      )}

      <div style={{ marginBottom: 8 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 10,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            marginBottom: 4,
            overflow: 'hidden',
            minWidth: 0,
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>CPU</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatCPU(cpu)} used</span>
        </div>
        <MiniBar value={cpu} max={100} color={service.color} />
      </div>

      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 10,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            marginBottom: 4,
            overflow: 'hidden',
            minWidth: 0,
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Memory</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatMemory(mem)}</span>
        </div>
        <MiniBar value={Math.min((mem / 1024) * 100, 100)} max={100} color={service.color} />
      </div>
    </div>
  )
}
