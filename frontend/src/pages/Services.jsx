import { useMemo, useState } from 'react'
import ServiceCard from '../components/cards/ServiceCard.jsx'
import { useServices } from '../hooks/useServices.js'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'healthy', label: 'Healthy' },
  { id: 'degraded', label: 'Degraded' },
  { id: 'down', label: 'Down' },
]

export default function Services() {
  const { services } = useServices()
  const [filter, setFilter] = useState('all')

  const filtered = useMemo(() => {
    if (filter === 'all') return services
    return services.filter((service) => {
      if (filter === 'healthy') return service.health === 'healthy'
      if (filter === 'degraded') return service.health === 'degraded'
      if (filter === 'down') return service.health !== 'healthy'
      return true
    })
  }, [services, filter])

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <section className="page-heading">
        <div>
          <h1>Services</h1>
          <p>Live health and telemetry for each AutoOps backend service.</p>
        </div>
      </section>

      <div className="card" style={{ padding: '1.35rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          {FILTERS.map((item) => (
            <button key={item.id} onClick={() => setFilter(item.id)} style={{ padding: '0.8rem 1rem', borderRadius: 999, background: item.id === filter ? 'rgba(56, 189, 248, 0.16)' : 'rgba(148, 163, 184, 0.08)', color: item.id === filter ? 'var(--text-primary)' : 'var(--text-secondary)', border: '1px solid rgba(148, 163, 184, 0.12)' }}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid-2">
        {filtered.map((service) => (
          <ServiceCard key={service.id} service={service} metrics={service} />
        ))}
      </div>
    </div>
  )
}
