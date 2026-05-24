import { useEffect, useMemo, useState } from 'react'

const SERVICES = [
  { id: 'api-gateway', name: 'API Gateway', lang: 'Node.js', port: 3000, color: '#00ff9d' },
  { id: 'user-service', name: 'User Service', lang: 'Python/FastAPI', port: 8000, color: '#38bdf8' },
  { id: 'metrics-collector', name: 'Metrics Collector', lang: 'Go', port: 9091, color: '#fb923c' },
  { id: 'healing-service', name: 'Healing Engine', lang: 'Python+AI', port: 8888, color: '#c084fc' },
]

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function round(value, decimals = 0) {
  const multiplier = 10 ** decimals
  return Math.round(Number(value) * multiplier) / multiplier
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min)
}

function formatTimeAgo(date) {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

function createBaseChartHistory() {
  return Array.from({ length: 30 }).map((_, index) => ({
    timestamp: Date.now() - (29 - index) * 10000,
    rps: round(110 + Math.sin(index / 4) * 38 + Math.random() * 12, 1),
    errorRate: round(clamp(0.6 + Math.sin(index / 6) * 0.45 + Math.random() * 0.5, 0.3, 3.2), 2),
    latency: Math.round(clamp(140 + Math.sin(index / 3) * 45 + Math.random() * 20, 120, 360)),
  }))
}

function buildSimulatedServices(history) {
  return SERVICES.map((service, index) => {
    const base = history[index % history.length]
    return {
      ...service,
      health: Math.random() > 0.08 ? 'healthy' : 'degraded',
      uptime: `${Math.floor(randomBetween(12, 96))}h`,
      version: `v1.0.${index + 2}`,
      rps: round(base.rps * randomBetween(0.75, 1.12), 1),
      errorRate: round(clamp(base.errorRate * randomBetween(0.8, 1.25), 0.2, 4.5), 2),
      p95: Math.round(clamp(base.latency * randomBetween(0.9, 1.1), 120, 420)),
      cpu: round(clamp(randomBetween(24, 78), 12, 92), 1),
      mem: round(clamp(randomBetween(190, 540), 120, 880), 1),
      history: Array.from({ length: 15 }).map((__n, offset) => ({
        timestamp: Date.now() - (14 - offset) * 10000,
        value: round(clamp(base.rps * randomBetween(0.8, 1.15), 20, 220), 1),
      })),
    }
  })
}

function buildSimulatedBuilds() {
  const statuses = ['SUCCESS', 'FAILURE', 'UNSTABLE', 'ABORTED']
  const branches = ['main', 'staging', 'feature/login-flow', 'feature/autoops-ai', 'hotfix/dashboard']
  return Array.from({ length: 12 }).map((_, index) => {
    const status = statuses[Math.floor(randomBetween(0, statuses.length))]
    const branch = branches[Math.floor(randomBetween(0, branches.length))]
    const number = 1342 - index
    const passed = status === 'SUCCESS' ? 120 : status === 'UNSTABLE' ? 95 : 70
    return {
      id: number,
      branch,
      commit: Math.random().toString(36).slice(2, 9),
      status,
      stage: Math.min(7, Math.max(0, 7 - Math.floor(randomBetween(0, 3)))),
      duration: Math.round(randomBetween(180, 560)),
      trivy: status === 'FAILURE' ? '2 CRITICAL' : 'CLEAN',
      sonar: status === 'FAILURE' ? 'D' : status === 'UNSTABLE' ? 'B' : 'A',
      triggeredBy: Math.random() > 0.3 ? 'cron' : 'manual',
      startedAt: Date.now() - randomBetween(60, 360) * 1000,
      passed,
    }
  })
}

function buildHealingEvents() {
  const actions = [
    { action: 'rollback', icon: '🔄', color: '#00ff9d' },
    { action: 'restart', icon: '♻️', color: '#38bdf8' },
    { action: 'scale_up', icon: '📈', color: '#c084fc' },
    { action: 'escalate', icon: '⚠️', color: '#fb923c' },
  ]
  const alerts = ['HighErrorRate', 'ServiceDown', 'SLOBreach', 'PodCrashLooping']
  const services = ['API Gateway', 'User Service', 'Metrics Collector', 'Healing Engine']

  return Array.from({ length: 6 }).map((_, index) => {
    const action = actions[index % actions.length]
    const alert = alerts[index % alerts.length]
    const service = services[index % services.length]
    const confidence = clamp(randomBetween(0.68, 0.98), 0.68, 0.99)
    const status = ['HEALED', 'FAILED', 'ANALYZING', 'ESCALATED'][Math.floor(randomBetween(0, 4))]
    return {
      id: `${Date.now()}-${index}`,
      alert_name: alert,
      severity: index % 3 === 0 ? 'critical' : 'warning',
      service,
      namespace: 'autoops-production',
      status,
      recommendation: {
        action: action.action,
        confidence,
        reasoning: `AI recommends ${action.action} for ${service} after detecting ${alert}.`,
        safe_to_automate: confidence > 0.8,
      },
      action_result: {
        success: status === 'HEALED',
        message: status === 'HEALED' ? 'Action completed successfully.' : 'Action is still processing.',
      },
      verified: status === 'HEALED',
      created_at: new Date(Date.now() - index * 120000).toISOString(),
      updated_at: new Date(Date.now() - index * 60000).toISOString(),
    }
  })
}

export function useSimulation() {
  const initialHistory = useMemo(() => createBaseChartHistory(), [])
  const [metrics, setMetrics] = useState({
    requestRate: 140,
    errorRate: 1.1,
    p95Latency: 180,
    p99Latency: 280,
    availability: 99.95,
    activeUsers: 870,
    healingCount: 24,
    servicesUp: 4,
    buildSuccessRate: 93,
    chartHistory: initialHistory,
  })
  const [services, setServices] = useState(buildSimulatedServices(initialHistory))
  const [builds, setBuilds] = useState(buildSimulatedBuilds())
  const [healingEvents, setHealingEvents] = useState(buildHealingEvents())

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) => {
        const nextHistory = [...prev.chartHistory.slice(1), {
          timestamp: Date.now(),
          rps: round(clamp(prev.requestRate + randomBetween(-12, 12), 95, 210), 1),
          errorRate: round(clamp(prev.errorRate + randomBetween(-0.15, 0.15), 0.4, 3.8), 2),
          latency: Math.round(clamp(prev.p95Latency + randomBetween(-10, 10), 120, 400)),
        }]
        return {
          ...prev,
          requestRate: nextHistory[nextHistory.length - 1].rps,
          errorRate: nextHistory[nextHistory.length - 1].errorRate,
          p95Latency: nextHistory[nextHistory.length - 1].latency,
          p99Latency: Math.round(clamp(nextHistory[nextHistory.length - 1].latency * 1.35, 200, 520)),
          availability: round(clamp(prev.availability + randomBetween(-0.01, 0.03), 99.82, 99.99), 2),
          activeUsers: Math.round(clamp(prev.activeUsers + randomBetween(-18, 18), 720, 940)),
          chartHistory: nextHistory,
        }
      })

      setServices((prev) => prev.map((service) => {
        const nextRps = round(clamp(service.rps + randomBetween(-8, 8), 16, 250), 1)
        return {
          ...service,
          health: Math.random() > 0.08 ? 'healthy' : 'degraded',
          rps: nextRps,
          errorRate: round(clamp(service.errorRate + randomBetween(-0.08, 0.08), 0.2, 5.4), 2),
          p95: Math.round(clamp(service.p95 + randomBetween(-6, 6), 110, 420)),
          cpu: round(clamp(service.cpu + randomBetween(-2, 2), 12, 92), 1),
          mem: round(clamp(service.mem + randomBetween(-10, 10), 110, 910), 1),
          history: [...service.history.slice(1), { timestamp: Date.now(), value: round(clamp(nextRps, 20, 220), 1) }],
        }
      }))

      setBuilds((prev) => prev.map((build) => ({
        ...build,
        duration: build.status === 'SUCCESS' || build.status === 'FAILURE' ? build.duration : build.duration + 4,
      })))

      setHealingEvents((prev) => {
        const next = [...prev]
        if (Math.random() > 0.7) {
          next.unshift({
            ...buildHealingEvents()[0],
            id: `${Date.now()}-gen`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        }
        return next.slice(0, 8)
      })
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const isSimulated = true

  return {
    metrics,
    services,
    builds,
    healingEvents,
    chartHistory: metrics.chartHistory,
    isSimulated,
  }
}
