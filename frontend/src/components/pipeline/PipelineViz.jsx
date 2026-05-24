import { CheckCircle2, Zap } from 'lucide-react'

const STAGES = ['Checkout', 'Lint', 'Test', 'SonarQube', 'Build', 'Trivy', 'Push', 'Deploy']

export default function PipelineViz({ activeStage = 1, buildStatus = 'running' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.8rem', flexWrap: 'wrap' }}>
      {STAGES.map((stage, index) => {
        const isActive = index === activeStage
        const completed = index < activeStage
        const stateColor = completed ? '#00ff9d' : isActive ? '#38bdf8' : 'rgba(148, 163, 184, 0.18)'
        return (
          <div key={stage} style={{ flex: '1 1 0', minWidth: 96, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.55rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: completed ? 'rgba(0,255,157,0.14)' : isActive ? 'rgba(56,189,248,0.14)' : 'rgba(148,163,184,0.08)', border: `1px solid ${stateColor}`, display: 'grid', placeItems: 'center' }}>
              {completed ? <CheckCircle2 size={18} color={stateColor} /> : isActive ? <Zap size={18} color={stateColor} /> : <span style={{ color: stateColor, fontWeight: 700 }}>{index + 1}</span>}
            </div>
            <div style={{ textAlign: 'center', fontSize: '0.77rem', color: 'var(--text-secondary)', lineHeight: 1.3, minHeight: '2.4rem' }}>{stage}</div>
          </div>
        )
      })}
    </div>
  )
}
