import { useEffect, useMemo, useState } from 'react'
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'

export default function Layout({ activeTab, onTabChange, children }) {
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => setLastUpdated(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const pageMetadata = useMemo(() => ({
    overview: { title: 'Platform Overview', subtitle: 'Real-time health, metrics and AI healing status' },
    services: { title: 'Services', subtitle: 'Live service health and telemetry' },
    pipeline: { title: 'CI/CD Pipeline', subtitle: 'Jenkins build and delivery pipeline status' },
    healing: { title: 'Self-Healing', subtitle: 'AI remediation events and recommendations' },
    infrastructure: { title: 'Infrastructure', subtitle: 'Kubernetes and GitOps status' },
    logs: { title: 'Logs', subtitle: 'Streaming platform event logs' },
  })[activeTab] || {})

  return (
    <div>
      <Topbar activeTab={activeTab} onTabChange={onTabChange} isLive={isLive} lastUpdated={lastUpdated} />
      <div className="dashboard-shell">
        <Sidebar activeTab={activeTab} onTabChange={onTabChange} />
        <main className="dashboard-content">
          {children}
        </main>
      </div>
    </div>
  )
}
