import { useMemo, useState } from 'react'
import ServiceCard from '../components/cards/ServiceCard.jsx'
import StatCard from '../components/cards/StatCard.jsx'
import AreaChart from '../components/charts/AreaChart.jsx'
import RadialGauge from '../components/charts/RadialGauge.jsx'
import HealingFeed from '../components/healing/HealingFeed.jsx'
import PipelineViz from '../components/pipeline/PipelineViz.jsx'
import { useHealingEvents } from '../hooks/useHealingEvents.js'
import { useMetrics } from '../hooks/useMetrics.js'
import { usePipeline } from '../hooks/usePipeline.js'
import { useServices } from '../hooks/useServices.js'
import { formatAvailability, formatErrorRate, formatLatency, formatRPS } from '../utils/format'

export default function Overview() {
  const { data: metrics, loading: metricsLoading, isLive } = useMetrics()
  const { events } = useHealingEvents()
  const { builds, activeStage } = usePipeline()
  const { services } = useServices()
  const [showDetails, setShowDetails] = useState(false)

  const chartData = useMemo(() => {
    if (!metrics?.chartHistory) return []
    return metrics.chartHistory.map((point) => ({
      timestamp: point.timestamp,
      rps: point.rps,
      errorRate: point.errorRate,
      latency: point.latency,
    }))
  }, [metrics])

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <section className="page-heading">
        <div>
          <h1>Platform Overview</h1>
          <p>Unified health, metrics, and AI healing telemetry for AutoOps.</p>
        </div>
      </section>

      <div className="grid-4">
        <StatCard label="Availability" value={formatAvailability(metrics?.availability)} accent="#00ff9d" delta={0.12} />
        <StatCard label="Request Rate" value={`${formatRPS(metrics?.requestRate)}/s`} accent="#38bdf8" delta={4.7} />
        <StatCard label="Error Rate" value={formatErrorRate(metrics?.errorRate)} accent={metrics?.errorRate > 2 ? '#ff4d6d' : '#facc15'} delta={metrics?.errorRate > 2 ? -0.6 : -0.2} deltaPositive={metrics?.errorRate < 2} />
        <StatCard label="P95 Latency" value={formatLatency(metrics?.p95Latency)} accent="#c084fc" delta={-3.4} />
      </div>

      <div className="split-grid">
        <div className="card" style={{ padding: '1.35rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Traffic Trends</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.35rem' }}>Live request volume and error rate from Prometheus.</p>
            </div>
          </div>
          <AreaChart data={chartData} lines={[{ key: 'rps', color: '#38bdf8', label: 'RPS' }, { key: 'errorRate', color: '#ff4d6d', label: 'Error %' }]} />
        </div>

        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
          <RadialGauge value={metrics?.availability ?? 99.9} max={100} label="Availability" color="#00ff9d" />
          <RadialGauge value={metrics?.p95Latency ?? 200} max={500} label="P95 Latency" color="#c084fc" unit="ms" />
          <RadialGauge value={metrics?.servicesUp ?? 4} max={4} label="Services Up" color="#38bdf8" unit="services" />
          <RadialGauge value={metrics?.errorRate ?? 1.1} max={10} label="Error Rate" color="#ff4d6d" unit="%" />
        </div>
      </div>

      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 700 }}>Service health</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.3rem' }}>Status overview for the core AutoOps services.</p>
          </div>
        </div>
        <div className="grid-4">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} metrics={service} />
          ))}
        </div>
      </section>

      <div className="split-grid">
        <div className="card" style={{ padding: '1.35rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Active Pipeline</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.35rem' }}>Latest Jenkins build status and stage progression.</p>
            </div>
          </div>
          <PipelineViz activeStage={activeStage} />
          <div style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Last build status is estimated for live or simulated Jenkins data.</div>
        </div>

        <div className="card" style={{ padding: '1.35rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Recent Healing Events</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.35rem' }}>Latest AI healing recommendations and outcomes.</p>
            </div>
          </div>
          <HealingFeed events={events.slice(0, 4)} />
        </div>
      </div>
    </div>
  )
}
