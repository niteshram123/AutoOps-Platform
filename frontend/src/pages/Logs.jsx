import { useEffect, useMemo, useRef, useState } from 'react'

const SERVICES = ['api-gateway', 'user-service', 'metrics-collector', 'healing-service']
const LEVELS = ['INFO', 'WARN', 'ERROR', 'DEBUG']

function buildLogMessage(service, level) {
  const messages = {
    INFO: ['Request processed successfully', 'Metrics snapshot recorded', 'Health check passed', 'Deployment sync completed'],
    WARN: ['High latency detected', 'Retry attempt 2/3', 'Cache miss occurred', 'Temporary connection delay'],
    ERROR: ['Connection timeout to user-service', 'Health endpoint failed', 'Prometheus scrape error', 'Jenkins crumb fetch failed'],
    DEBUG: ['Payload parsed', 'Cache warm-up', 'HTTP header validated', 'Simulated healing event queued'],
  }
  const options = messages[level]
  return options[Math.floor(Math.random() * options.length)]
}

function formatLine(entry) {
  return `${new Date(entry.timestamp).toLocaleTimeString()} | ${entry.level} | ${entry.service} | ${entry.message}`
}

export default function Logs() {
  const [logs, setLogs] = useState([])
  const [serviceFilter, setServiceFilter] = useState('all')
  const [levelFilter, setLevelFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [paused, setPaused] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const interval = setInterval(() => {
      if (paused) return
      setLogs((prev) => [
        ...prev.slice(-79),
        {
          timestamp: Date.now(),
          service: SERVICES[Math.floor(Math.random() * SERVICES.length)],
          level: LEVELS[Math.floor(Math.random() * LEVELS.length)],
          message: buildLogMessage(SERVICES[Math.floor(Math.random() * SERVICES.length)], LEVELS[Math.floor(Math.random() * LEVELS.length)]),
        },
      ])
    }, 1200)
    return () => clearInterval(interval)
  }, [paused])

  useEffect(() => {
    if (paused) return
    const el = containerRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [logs, paused])

  const filteredLogs = useMemo(() => logs.filter((entry) => {
    const serviceMatch = serviceFilter === 'all' || entry.service === serviceFilter
    const levelMatch = levelFilter === 'ALL' || entry.level === levelFilter
    const searchMatch = search ? formatLine(entry).toLowerCase().includes(search.toLowerCase()) : true
    return serviceMatch && levelMatch && searchMatch
  }), [logs, serviceFilter, levelFilter, search])

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <section className="page-heading">
        <div>
          <h1>Logs</h1>
          <p>Streaming platform log console with simulated live events.</p>
        </div>
      </section>

      <div className="card" style={{ padding: '1.35rem', display: 'grid', gap: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', alignItems: 'center' }}>
          <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} style={{ padding: '0.85rem 1rem', borderRadius: 14, background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(148, 163, 184, 0.14)', color: 'var(--text-primary)' }}>
            <option value="all">All services</option>
            {SERVICES.map((service) => <option key={service} value={service}>{service}</option>)}
          </select>
          <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} style={{ padding: '0.85rem 1rem', borderRadius: 14, background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(148, 163, 184, 0.14)', color: 'var(--text-primary)' }}>
            <option value="ALL">All levels</option>
            {LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
          </select>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search logs..." style={{ flex: 1, minWidth: 180, padding: '0.85rem 1rem', borderRadius: 14, background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(148, 163, 184, 0.14)', color: 'var(--text-primary)' }} />
          <button onClick={() => setPaused((prev) => !prev)} style={{ padding: '0.85rem 1rem', borderRadius: 14, background: '#38bdf8', color: '#020617', fontWeight: 700 }}>{paused ? 'Resume' : 'Pause scroll'}</button>
        </div>
      </div>

      <div ref={containerRef} className="card scrollbar-thin" style={{ padding: '1rem', height: '520px', overflowY: 'auto', background: '#050a12' }}>
        {filteredLogs.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', padding: '1.5rem' }}>No logs match the filter.</div>
        ) : (
          filteredLogs.map((entry, index) => (
            <div key={`${entry.timestamp}-${index}`} style={{ padding: '0.75rem 0.85rem', borderBottom: '1px solid rgba(148, 163, 184, 0.08)', color: entry.level === 'ERROR' ? '#ff9a9a' : entry.level === 'WARN' ? '#facc15' : entry.level === 'DEBUG' ? '#94a3b8' : '#e2e8f0', fontFamily: 'DM Mono, monospace', fontSize: '0.86rem' }}>
              {formatLine(entry)}
            </div>
          ))
        )}
      </div>

      <div className="card" style={{ padding: '1.35rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--text-secondary)' }}>Showing {filteredLogs.length} of {logs.length} log lines</span>
        <button onClick={() => {
          const content = filteredLogs.map(formatLine).join('\n')
          const blob = new Blob([content], { type: 'text/plain' })
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = 'autoops-logs.txt'
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
        }} style={{ padding: '0.85rem 1rem', borderRadius: 14, background: 'rgba(56, 189, 248, 0.14)', color: 'var(--text-primary)' }}>Export</button>
      </div>
    </div>
  )
}
