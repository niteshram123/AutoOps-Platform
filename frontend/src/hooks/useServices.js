import { useEffect, useState } from 'react'
import { useSimulation } from './useSimulation.js'

const SERVICES = [
  { id: 'api-gateway', name: 'API Gateway', url: 'http://localhost:3000', lang: 'Node.js/Express', color: '#00ff9d' },
  { id: 'user-service', name: 'User Service', url: 'http://localhost:8000', lang: 'Python/FastAPI', color: '#38bdf8' },
  { id: 'metrics-collector', name: 'Metrics Collector', url: 'http://localhost:9091', lang: 'Go', color: '#fb923c' },
  { id: 'healing-service', name: 'Healing Engine', url: 'http://localhost:8888', lang: 'Python/AIO', color: '#c084fc' },
]

const controller = new AbortController()

function timeoutPromise(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchHealth(url) {
  try {
    const res = await Promise.race([
      fetch(`${url}/health`, { mode: 'cors', signal: controller.signal }),
      timeoutPromise(2000).then(() => {
        throw new Error('timeout')
      }),
    ])
    if (!res.ok) throw new Error('unhealthy')
    return res.json()
  } catch {
    return null
  }
}

export function useServices(intervalMs = 5000) {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isLive, setIsLive] = useState(false)
  const simulation = useSimulation()

  async function refresh() {
    setLoading(true)
    try {
      const results = await Promise.all(SERVICES.map((service) => fetchHealth(service.url)))
      if (results.some((result) => result === null)) {
        throw new Error('One or more service health checks failed')
      }
      const normalized = SERVICES.map((service, index) => ({
        ...service,
        health: results[index]?.status ?? 'up',
        uptime: results[index]?.uptime ?? '36h',
        version: results[index]?.version ?? 'v1.0.0',
        rps: Math.round(Math.random() * 50 + 60),
        errorRate: Number((Math.random() * 1.8 + 0.2).toFixed(2)),
        p95: Math.round(Math.random() * 120 + 120),
        cpu: Math.round(Math.random() * 60 + 15),
        mem: Math.round(Math.random() * 320 + 140),
      }))
      setServices(normalized)
      setIsLive(true)
      setError(null)
    } catch (err) {
      console.warn('[useServices]', err)
      setServices(simulation.services)
      setError(err)
      setIsLive(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, intervalMs)
    return () => {
      clearInterval(interval)
      controller.abort()
    }
  }, [intervalMs])

  return { services, loading, error, isLive }
}
