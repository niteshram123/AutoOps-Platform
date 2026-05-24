import StatusBadge from '../common/StatusBadge.jsx'

const ACTION_MAP = {
  rollback: { label: 'Rollback', color: '#00ff9d', icon: '🔄' },
  restart: { label: 'Restart', color: '#38bdf8', icon: '♻️' },
  scale_up: { label: 'Scale Up', color: '#c084fc', icon: '📈' },
  escalate: { label: 'Escalate', color: '#fb923c', icon: '⚠️' },
}

export default function HealingFeed({ events = [] }) {
  return (
    <div className="card" style={{ padding: '1.35rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Healing Feed</h3>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{events.length} recent actions</span>
      </div>
      <div style={{ display: 'grid', gap: '0.95rem' }}>
        {events.map((event) => {
          const action = ACTION_MAP[event.recommendation.action] || ACTION_MAP.rollback
          return (
            <div key={event.id} style={{ display: 'grid', gap: '0.75rem', padding: '1rem', borderRadius: '18px', border: `1px solid rgba(148, 163, 184, 0.12)`, background: 'rgba(255,255,255,0.02)', animation: 'slideInDown 0.32s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: `${action.color}22`, display: 'grid', placeItems: 'center', fontSize: '1.1rem' }}>{action.icon}</div>
                  <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>{action.label} · {event.alert_name}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{new Date(event.created_at).toLocaleString()}</div>
                  </div>
                </div>
                <StatusBadge status={event.status} />
              </div>
              <div style={{ color: 'var(--text-primary)', fontSize: '0.92rem' }}>{event.recommendation.reasoning}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                  Confidence: {(event.recommendation.confidence * 100).toFixed(0)}% · {event.service}
                </div>
                <div style={{ color: event.action_result.success ? '#00ff9d' : '#facc15', fontWeight: 700 }}>{event.action_result.message}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
