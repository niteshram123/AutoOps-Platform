const STEPS = [
  { title: 'AlertManager', subtitle: 'Alert routing', color: '#38bdf8' },
  { title: 'Webhook', subtitle: 'Event ingest', color: '#c084fc' },
  { title: 'AI Analyzer', subtitle: 'Claude + rules', color: '#8b5cf6' },
  { title: 'Healer', subtitle: 'Action execution', color: '#00ff9d' },
  { title: 'Verifier', subtitle: 'Health check', color: '#facc15' },
  { title: 'Audit + Grafana', subtitle: 'Timeline & annotations', color: '#fb923c' },
]

export default function HealingWorkflow() {
  return (
    <div className="card" style={{ padding: '1.35rem' }}>
      <div style={{ display: 'grid', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Healing Workflow</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.35rem' }}>Live AI-driven remediation flow from alert to recovery.</p>
          </div>
        </div>
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          {STEPS.map((step, index) => (
            <div key={step.title} style={{ padding: '1rem', borderRadius: '18px', border: `1px solid rgba(148, 163, 184, 0.12)`, background: 'rgba(255,255,255,0.03)', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 16, right: 16, width: 10, height: 10, borderRadius: '50%', background: step.color }} />
              <div style={{ color: step.color, fontWeight: 700, fontSize: '0.94rem', marginBottom: '0.6rem' }}>{step.title}</div>
              <div style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{step.subtitle}</div>
              {index < STEPS.length - 1 ? <div style={{ position: 'absolute', bottom: 16, right: 16, color: 'var(--text-muted)', fontSize: '1rem' }}>→</div> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
