
const STATUS_MAP = {
  healthy: { label: 'Healthy', tone: 'green' },
  success: { label: 'Success', tone: 'green' },
  HEALED: { label: 'Healed', tone: 'green' },
  Synced: { label: 'Synced', tone: 'green' },
  running: { label: 'Running', tone: 'blue' },
  pending: { label: 'Pending', tone: 'yellow' },
  warning: { label: 'Warning', tone: 'yellow' },
  degraded: { label: 'Degraded', tone: 'yellow' },
  ANALYZING: { label: 'Analyzing', tone: 'yellow' },
  failed: { label: 'Failed', tone: 'red' },
  FAILED: { label: 'Failed', tone: 'red' },
  ESCALATED: { label: 'Escalated', tone: 'red' },
  error: { label: 'Error', tone: 'red' },
  unknown: { label: 'Unknown', tone: 'muted' },
}

export default function StatusBadge({ status, size = 'sm' }) {
  const meta = STATUS_MAP[status] || { label: status || 'Unknown', tone: 'muted' }
  const base = 'status-pill'
  const sizeClass = size === 'md' ? 'px-3 py-1 text-[0.8rem]' : 'px-2 py-0.75 text-[0.74rem]'
  const colorClass = {
    green: 'background: rgba(0, 255, 157, 0.12); color: #00ff9d;',
    blue: 'background: rgba(56, 189, 248, 0.12); color: #38bdf8;',
    yellow: 'background: rgba(251, 199, 55, 0.12); color: #facc15;',
    red: 'background: rgba(255, 77, 109, 0.12); color: #ff4d6d;',
    muted: 'background: rgba(148, 163, 184, 0.08); color: var(--text-secondary);',
  }[meta.tone]

  return (
    <span className={base} style={{ borderRadius: 999, padding: '0.45rem 0.8rem', fontSize: size === 'md' ? '0.82rem' : '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem', ...Object.fromEntries(Object.entries({}).filter(Boolean)), background: colorClass.split(';')[0].replace('background: ', ''), color: colorClass.split(';')[1].replace('color: ', '') }}>
      <span className="status-dot" style={{ width: '0.55rem', height: '0.55rem', borderRadius: '999px', background: meta.tone === 'green' ? '#00ff9d' : meta.tone === 'blue' ? '#38bdf8' : meta.tone === 'yellow' ? '#facc15' : meta.tone === 'red' ? '#ff4d6d' : '#94a3b8' }} />
      {meta.label}
    </span>
  )
}
