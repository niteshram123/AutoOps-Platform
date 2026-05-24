import ConnectionStatus from '../common/ConnectionStatus.jsx'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'services', label: 'Services' },
  { id: 'pipeline', label: 'CI/CD' },
  { id: 'healing', label: 'Self-Healing' },
  { id: 'infrastructure', label: 'Infrastructure' },
  { id: 'logs', label: 'Logs' },
]

export default function Topbar({ activeTab, onTabChange, isLive, lastUpdated }) {
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(10, 14, 23, 0.96)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(148, 163, 184, 0.08)', padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.95rem' }}>
        <div style={{ width: 42, height: 42, display: 'grid', placeItems: 'center', borderRadius: 12, background: 'radial-gradient(circle at top left, #38bdf8, transparent 50%)' }}>
          <span style={{ fontSize: '1.35rem' }}>⬡</span>
        </div>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 700 }}>AutoOps Platform</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>AI-assisted self-healing control plane</div>
        </div>
      </div>
      <nav style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => onTabChange(tab.id)} style={{ padding: '0.75rem 1rem', borderRadius: 999, color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)', background: activeTab === tab.id ? 'rgba(56, 189, 248, 0.16)' : 'transparent', border: '1px solid rgba(148, 163, 184, 0.12)', transition: 'background 0.2s ease' }}>
            {tab.label}
          </button>
        ))}
      </nav>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
        <ConnectionStatus isLive={isLive} lastUpdated={lastUpdated} />
      </div>
    </header>
  )
}
