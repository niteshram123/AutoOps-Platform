import { useMemo, useState } from 'react'
import { useSimulation } from '../hooks/useSimulation.js'

export default function Infrastructure() {
  const { services } = useSimulation()
  const [namespace] = useState('autoops-staging')

  const clusterInfo = useMemo(() => ({
    cluster: 'kind-autoops',
    nodes: 3,
    region: 'local',
    status: 'healthy',
  }), [])

  const apps = useMemo(() => ([
    { name: 'autoops-platform', status: 'Synced', health: 'Healthy', revision: 'main@c4d2a3', path: 'helm/autoops-platform' },
    { name: 'user-service', status: 'Synced', health: 'Healthy', revision: 'v1.0.0', path: 'helm/charts/user-service' },
    { name: 'healing-service', status: 'OutOfSync', health: 'Progressing', revision: 'v1.0.0', path: 'helm/autoops-platform' },
  ]), [])

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <section className="page-heading">
        <div>
          <h1>Infrastructure</h1>
          <p>Cluster, GitOps and Kubernetes health summary for AutoOps.</p>
        </div>
      </section>

      <div className="grid-3">
        <div className="card" style={{ padding: '1.35rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Kubernetes Cluster</h3>
          </div>
          <div style={{ display: 'grid', gap: '0.7rem' }}>
            <div style={{ color: 'var(--text-secondary)' }}>Name</div>
            <div style={{ fontWeight: 700 }}>{clusterInfo.cluster}</div>
            <div style={{ color: 'var(--text-secondary)' }}>Nodes</div>
            <div>{clusterInfo.nodes}</div>
            <div style={{ color: 'var(--text-secondary)' }}>Status</div>
            <div>{clusterInfo.status}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.35rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>ArgoCD</h3>
          </div>
          <div style={{ display: 'grid', gap: '0.7rem' }}>
            <div style={{ color: 'var(--text-secondary)' }}>Applications</div>
            <div>3</div>
            <div style={{ color: 'var(--text-secondary)' }}>Synced</div>
            <div>3 / 3</div>
            <div style={{ color: 'var(--text-secondary)' }}>Healthy</div>
            <div>3 / 3</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.35rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Terraform</h3>
          </div>
          <div style={{ display: 'grid', gap: '0.7rem' }}>
            <div style={{ color: 'var(--text-secondary)' }}>Resources</div>
            <div>21</div>
            <div style={{ color: 'var(--text-secondary)' }}>Modules</div>
            <div>6</div>
            <div style={{ color: 'var(--text-secondary)' }}>State</div>
            <div>Clean</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '1.35rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>ArgoCD Applications</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.35rem' }}>Current sync and health status for GitOps apps.</p>
          </div>
        </div>
        <div style={{ display: 'grid', gap: '1rem' }}>
          {apps.map((app) => (
            <div key={app.name} style={{ padding: '1rem', borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(148, 163, 184, 0.10)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{app.name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>{app.path}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ color: app.status === 'Synced' ? '#00ff9d' : '#facc15' }}>{app.status}</span>
                  <span style={{ color: app.health === 'Healthy' ? '#00ff9d' : '#fb923c' }}>{app.health}</span>
                </div>
              </div>
              <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                <span>{app.revision}</span>
                <button style={{ padding: '0.65rem 1rem', borderRadius: 999, background: 'rgba(56, 189, 248, 0.14)', color: 'var(--text-primary)' }}>Sync Now</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: '1.35rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Pod Summary</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.35rem' }}>Kubernetes pod availability for {namespace}.</p>
        </div>
        <div style={{ display: 'grid', gap: '1rem' }}>
          {services.map((service) => (
            <div key={service.id} style={{ display: 'grid', gap: '0.4rem', padding: '1rem', borderRadius: 16, background: 'rgba(255,255,255,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
                <div style={{ fontWeight: 700 }}>{service.name}</div>
                <span style={{ color: service.health === 'healthy' ? '#00ff9d' : '#facc15' }}>{service.health}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                <span>Ready 3/3</span>
                <span>Restarts 0</span>
                <span>Age 18m</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
