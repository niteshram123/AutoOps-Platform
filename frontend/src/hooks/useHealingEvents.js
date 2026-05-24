import { useEffect, useState } from 'react'
import { getHealingEvents, getHealingSummary } from '../api/healing.js'
import { useSimulation } from './useSimulation.js'

export function useHealingEvents(intervalMs = 10000) {
  const [events, setEvents] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isLive, setIsLive] = useState(false)
  const simulation = useSimulation()

  async function refresh() {
    setLoading(true)
    try {
      const [eventRes, summaryRes] = await Promise.all([
        getHealingEvents(),
        getHealingSummary(),
      ])
      if (!eventRes || !summaryRes) {
        throw new Error('Healing service data unavailable')
      }
      setEvents(eventRes)
      setSummary(summaryRes)
      setIsLive(true)
      setError(null)
    } catch (err) {
      console.warn('[useHealingEvents]', err)
      setEvents(simulation.healingEvents)
      setSummary({
        total_events: simulation.healingEvents.length,
        success_rate: 0.79,
        by_action: { rollback: 3, restart: 2, scale_up: 1 },
        by_service: {
          'API Gateway': 2,
          'User Service': 2,
          'Metrics Collector': 1,
        },
      })
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

  return { events, summary, loading, error, isLive }
}
