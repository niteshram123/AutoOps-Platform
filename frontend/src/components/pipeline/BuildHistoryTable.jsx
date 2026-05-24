import StatusBadge from '../common/StatusBadge.jsx'

const branchColors = {
  main: '#00ff9d',
  staging: '#38bdf8',
  feature: '#c084fc',
  hotfix: '#fb923c',
}

function formatBranch(branch) {
  if (branch === 'main') return 'main'
  if (branch === 'staging') return 'staging'
  return branch
}

export default function BuildHistoryTable({ builds = [] }) {
  return (
    <div className="card" style={{ padding: '1.35rem' }}>
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Build History</h3>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{builds.length} records</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.65rem' }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--text-secondary)', fontSize: '0.83rem' }}>
              <th>BUILD #</th>
              <th>BRANCH</th>
              <th>COMMIT</th>
              <th>STATUS</th>
              <th>PIPELINE</th>
              <th>DURATION</th>
              <th>TRIVY</th>
              <th>SONAR</th>
              <th>TRIGGERED BY</th>
            </tr>
          </thead>
          <tbody>
            {builds.map((build) => (
              <tr key={build.id} style={{ background: 'rgba(255,255,255,0.025)', borderRadius: '14px', border: '1px solid rgba(148,163,184,0.1)' }}>
                <td style={{ padding: '0.9rem 0.9rem', fontFamily: 'DM Mono, monospace' }}>#{build.id}</td>
                <td style={{ padding: '0.9rem 0.9rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.35rem 0.7rem', borderRadius: 999, background: branchColors[build.branch.split('/')[0]] + '22', color: branchColors[build.branch.split('/')[0]] }}>
                    {formatBranch(build.branch)}
                  </span>
                </td>
                <td style={{ padding: '0.9rem 0.9rem', fontFamily: 'DM Mono, monospace' }}>{build.commit}</td>
                <td style={{ padding: '0.9rem 0.9rem' }}><StatusBadge status={build.status === 'SUCCESS' ? 'healthy' : build.status === 'FAILURE' ? 'failed' : build.status === 'UNSTABLE' ? 'warning' : 'running'} /></td>
                <td style={{ padding: '0.9rem 0.9rem' }}><div style={{ display: 'flex', gap: '0.28rem' }}>{Array.from({ length: 8 }).map((_, idx) => <span key={idx} style={{ width: 8, height: 8, borderRadius: 999, background: idx <= build.stage ? 'var(--accent-blue)' : 'rgba(148, 163, 184, 0.15)' }} />)}</div></td>
                <td style={{ padding: '0.9rem 0.9rem', color: 'var(--text-secondary)' }}>{Math.floor(build.duration / 60)}m {build.duration % 60}s</td>
                <td style={{ padding: '0.9rem 0.9rem', color: build.trivy === 'CLEAN' ? '#00ff9d' : '#ff4d6d' }}>{build.trivy}</td>
                <td style={{ padding: '0.9rem 0.9rem', color: build.sonar === 'A' ? '#00ff9d' : build.sonar === 'B' ? '#facc15' : '#fb923c' }}>{build.sonar}</td>
                <td style={{ padding: '0.9rem 0.9rem' }}>{build.triggeredBy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
