import { useMemo } from 'react'
import StatCard from '../components/cards/StatCard.jsx'
import AreaChart from '../components/charts/AreaChart.jsx'
import BuildHistoryTable from '../components/pipeline/BuildHistoryTable.jsx'
import PipelineViz from '../components/pipeline/PipelineViz.jsx'
import { usePipeline } from '../hooks/usePipeline.js'

export default function Pipeline() {
  const { builds, stats, activeStage } = usePipeline()

  const latestBuild = builds[0] || {}
  const chartData = useMemo(() => {
    return builds.map((build, index) => ({
      name: `#${build.id}`,
      success: build.status === 'SUCCESS' ? 1 : 0,
      failure: build.status !== 'SUCCESS' ? 1 : 0,
    })).reverse()
  }, [builds])

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <section className="page-heading">
        <div>
          <h1>CI/CD Pipeline</h1>
          <p>Build history, active pipeline stage, and Jenkins metrics.</p>
        </div>
      </section>

      <div className="grid-4">
        <StatCard label="Builds Today" value={stats?.totalToday ?? '--'} unit="builds" accent="#38bdf8" />
        <StatCard label="Success Rate" value={stats?.successRate ?? '--'} unit="%" accent="#00ff9d" />
        <StatCard label="Avg Duration" value={stats?.avgDuration ?? '--'} unit="s" accent="#c084fc" />
        <StatCard label="Critical CVEs" value={stats?.criticalCVEs ?? '--'} accent="#fb923c" />
      </div>

      <div className="split-grid">
        <div className="card" style={{ padding: '1.35rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Active Build</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.35rem' }}>Current Jenkins pipeline stage.</p>
          </div>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ display: 'grid', gap: '0.8rem' }}>
              <div style={{ color: 'var(--text-secondary)' }}>Build</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>#{latestBuild.id ?? '--'} • {latestBuild.branch ?? 'main'}</div>
              <div style={{ color: 'var(--text-secondary)' }}>{latestBuild.commit ?? 'unknown commit'}</div>
            </div>
            <PipelineViz activeStage={activeStage} buildStatus={latestBuild.status?.toLowerCase()} />
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>Triggered by {latestBuild.triggeredBy ?? 'system'}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>Duration: {latestBuild.duration ? `${Math.floor(latestBuild.duration / 60)}m ${latestBuild.duration % 60}s` : '--'}</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.35rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Pipeline Trend</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.35rem' }}>Recent build success vs failure count.</p>
          </div>
          <AreaChart data={chartData} lines={[{ key: 'success', color: '#00ff9d' }, { key: 'failure', color: '#ff4d6d' }]} />
        </div>
      </div>

      <BuildHistoryTable builds={builds} />
    </div>
  )
}
