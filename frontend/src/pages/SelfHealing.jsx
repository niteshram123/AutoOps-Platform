import { useMemo, useState } from 'react'
import { triggerTestAlert } from '../api/healing.js'
import StatCard from '../components/cards/StatCard.jsx'
import HealingFeed from '../components/healing/HealingFeed.jsx'
import HealingWorkflow from '../components/healing/HealingWorkflow.jsx'
import { useHealingEvents } from '../hooks/useHealingEvents.js'

const ALERT_TYPES = ['HighErrorRate', 'ServiceDown', 'HighLatency']
const SERVICES = ['API Gateway', 'User Service', 'Metrics Collector', 'Healing Engine']

export default function SelfHealing() {
  const { events, summary, isLive } = useHealingEvents()
  const [alertType, setAlertType] = useState(ALERT_TYPES[0])
  const [service, setService] = useState(SERVICES[0])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const stats = useMemo(() => ({
    totalHealed: summary?.total_events ?? 0,
    successRate: summary?.success_rate ? Math.round(summary.success_rate * 100) : 78,
    escalated: summary?.by_action?.escalate ?? 0,
    avgHealTime: 24,
  }), [summary])

  async function handleSimulate() {
    setBusy(true)
    setMessage('Simulating alert and healing event...')
    const result = await triggerTestAlert(alertType, service)
    setMessage(result ? 'Simulation request sent successfully.' : 'Simulation failed; using demo mode.')
    setBusy(false)
  }

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <section className="page-heading">
        <div>
          <h1>Self-Healing</h1>
          <p>AI-driven remediation telemetry and incident simulation controls.</p>
        </div>
      </section>

      <div className="grid-4">
        <StatCard label="Total Healed" value={stats.totalHealed} accent="#00ff9d" />
        <StatCard label="Success Rate" value={stats.successRate} unit="%" accent="#38bdf8" />
        <StatCard label="Escalated" value={stats.escalated} accent="#fb923c" />
        <StatCard label="Avg Heal Time" value={stats.avgHealTime} unit="m" accent="#c084fc" />
      </div>

      <HealingWorkflow />

      <div className="split-grid">
        <div className="card" style={{ padding: '1.35rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>AI Actions</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.35rem' }}>Decision breakdown by action type.</p>
          </div>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {Object.entries(summary?.by_action || { rollback: 3, restart: 2, scale_up: 1 }).map(([action, count]) => (
              <div key={action} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{action}</div>
                <div style={{ color: 'var(--text-secondary)' }}>{count}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: '1.35rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Confidence Histogram</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.35rem' }}>AI confidence distribution for healing decisions.</p>
          </div>
          <div style={{ display: 'grid', gap: '0.8rem' }}>
            {[90, 80, 70, 60, 50].map((threshold, idx) => (
              <div key={threshold} style={{ display: 'grid', gap: '0.4rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <span>{threshold}%+</span>
                  <span>{(5 - idx) * 12}</span>
                </div>
                <div style={{ width: '100%', height: 10, borderRadius: 999, background: 'rgba(148, 163, 184, 0.12)' }}>
                  <div style={{ width: `${(5 - idx) * 18}%`, height: '100%', borderRadius: 999, background: '#8b5cf6' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <HealingFeed events={events} />

      <div className="card" style={{ padding: '1.35rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Trigger Test Alert</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.35rem' }}>Simulate an incident for demo and verify healing behavior.</p>
        </div>
        <div style={{ display: 'grid', gap: '1rem', maxWidth: 520 }}>
          <label style={{ display: 'grid', gap: '0.35rem', color: 'var(--text-secondary)' }}>
            Alert type
            <select value={alertType} onChange={(event) => setAlertType(event.target.value)} style={{ padding: '0.9rem 1rem', borderRadius: 14, background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(148, 163, 184, 0.14)', color: 'var(--text-primary)' }}>
              {ALERT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label style={{ display: 'grid', gap: '0.35rem', color: 'var(--text-secondary)' }}>
            Target service
            <select value={service} onChange={(event) => setService(event.target.value)} style={{ padding: '0.9rem 1rem', borderRadius: 14, background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(148, 163, 184, 0.14)', color: 'var(--text-primary)' }}>
              {SERVICES.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <button onClick={handleSimulate} disabled={busy} style={{ width: 'fit-content', padding: '0.95rem 1.35rem', borderRadius: 14, background: '#38bdf8', color: '#020617', fontWeight: 700, transition: 'transform 0.2s ease' }}>
            {busy ? 'Simulating…' : 'Simulate Incident'}
          </button>
          {message && <div style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>{message}</div>}
        </div>
      </div>
    </div>
  )
}
