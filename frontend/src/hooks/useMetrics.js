import { useEffect, useState } from 'react'
import { queries, queryInstant } from '../api/prometheus.js'
import { useSimulation } from './useSimulation.js'

export function useMetrics(intervalMs = 5000) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isLive, setIsLive] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const simulation = useSimulation()

  async function refresh() {
    setLoading(true)
    try {
      const [rpsRes, errRes, p95Res, p99Res, availRes, activeUsersRes, healthRes] = await Promise.all([
        queryInstant(queries.requestRate),
        queryInstant(queries.errorRate),
        queryInstant(queries.p95Latency),
        queryInstant(queries.p99Latency),
        queryInstant(queries.availability),
        queryInstant(queries.activeUsers),
        queryInstant(queries.serviceHealth),
      ])

      if (!rpsRes || !errRes || !p95Res || !p99Res || !availRes || !activeUsersRes || !healthRes) {
        throw new Error('Prometheus endpoint returned invalid data')
      }

      const rps = Number(rpsRes.data.result?.reduce((sum, item) => sum + Number(item.value[1]), 0), 0) || 0
      const errorRate = Number(errRes.data.result?.reduce((sum, item) => sum + Number(item.value[1]), 0), 0) || 0
      const p95Latency = Number(p95Res.data.result?.[0]?.value?.[1] ?? 0)
      const p99Latency = Number(p99Res.data.result?.[0]?.value?.[1] ?? 0)
      const availability = Number(availRes.data.result?.reduce((sum, item) => sum + Number(item.value[1]), 0), 0) / Math.max(availRes.data.result.length, 1)
      const activeUsers = Number(activeUsersRes.data.result?.[0]?.value?.[1] ?? 0)
      const services = healthRes.data.result?.map((item) => ({
        service: item.metric.service,
        status: Number(item.value[1]) === 1 ? 'healthy' : 'down',
      })) || []

      setData({
        requestRate: Math.round(rps),
        errorRate: Number(errorRate.toFixed(2)),
        p95Latency: Math.round(p95Latency),
        p99Latency: Math.round(p99Latency),
        availability: Number((availability * 100).toFixed(2)),
        activeUsers: Math.round(activeUsers),
        servicesUp: services.filter((item) => item.status === 'healthy').length,
        byService: services.reduce((acc, item) => {
          acc[item.service] = { available: item.status === 'healthy' }
          return acc
        }, {}),
      })
      setLastUpdated(new Date())
      setIsLive(true)
      setError(null)
    } catch (err) {
      console.warn('[useMetrics]', err)
      setData(simulation.metrics)
      setIsLive(false)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, intervalMs)
    return () => clearInterval(interval)
  }, [intervalMs])

  return { data: data || simulation.metrics, loading, error, isLive, lastUpdated }
}
