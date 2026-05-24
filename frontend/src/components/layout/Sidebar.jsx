const LINKS = [
  { label: 'Grafana', href: 'http://localhost:3001' },
  { label: 'Jenkins', href: 'http://localhost:8080' },
  { label: 'ArgoCD', href: 'http://localhost:8080' },
  { label: 'SonarQube', href: 'http://localhost:9000' },
  { label: 'Prometheus', href: 'http://localhost:9090' },
  { label: 'AlertManager', href: 'http://localhost:9093' },
  { label: 'Registry UI', href: 'http://localhost:5001' },
]

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview' },
  { id: 'services', label: 'Services' },
  { id: 'pipeline', label: 'CI/CD' },
  { id: 'healing', label: 'Self-Healing' },
  { id: 'infrastructure', label: 'Infrastructure' },
  { id: 'logs', label: 'Logs' },
]

export default function Sidebar({ activeTab, onTabChange }) {
  return (
    <aside style={{ width: 220, minWidth: 220, background: 'rgba(10, 14, 23, 0.96)', borderRight: '1px solid rgba(148, 163, 184, 0.08)', padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'sticky', top: 0, alignSelf: 'flex-start', height: '100vh' }}>
      <div>
        <div style={{ fontSize: '0.85rem', letterSpacing: '0.22em', color: 'var(--text-secondary)', marginBottom: '1rem' }}>NAVIGATION</div>
        <div style={{ display: 'grid', gap: '0.55rem' }}>
          {NAV_ITEMS.map((item) => (
            <button key={item.id} onClick={() => onTabChange(item.id)} style={{ width: '100%', textAlign: 'left', padding: '0.95rem 1rem', borderRadius: 14, border: '1px solid rgba(148, 163, 184, 0.12)', background: item.id === activeTab ? 'rgba(56, 189, 248, 0.14)' : 'transparent', color: item.id === activeTab ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: item.id === activeTab ? 700 : 500 }}>
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginTop: '1rem' }}>
        <div style={{ fontSize: '0.85rem', letterSpacing: '0.22em', color: 'var(--text-secondary)', marginBottom: '1rem' }}>QUICK LINKS</div>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {LINKS.map((link) => (
            <a key={link.label} href={link.href} target="_blank" rel="noreferrer" style={{ color: 'var(--text-secondary)', padding: '0.75rem 1rem', borderRadius: 12, background: 'rgba(148, 163, 184, 0.04)', display: 'block' }}>
              {link.label}
            </a>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(148, 163, 184, 0.08)', color: 'var(--text-secondary)' }}>
        <div style={{ fontWeight: 700, marginBottom: '0.35rem' }}>Phase 5 / 5</div>
        <div style={{ fontSize: '0.88rem', lineHeight: 1.6 }}>Production-ready control plane with AI healing and monitoring.</div>
      </div>
    </aside>
  )
}
