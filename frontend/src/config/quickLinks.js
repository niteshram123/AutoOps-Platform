const env = import.meta.env

function fromEnv(key, fallback) {
  return env[key] || fallback
}

export const QUICK_LINKS = [
  {
    label: 'Grafana',
    href: fromEnv('VITE_GRAFANA_URL', 'http://localhost:3001'),
    candidates: ['http://localhost:3001'],
  },
  {
    label: 'Jenkins',
    href: fromEnv('VITE_JENKINS_URL', 'http://localhost:8080'),
    candidates: ['http://localhost:8080'],
  },
  {
    label: 'ArgoCD',
    href: fromEnv('VITE_ARGOCD_URL', 'http://localhost:8081'),
    candidates: ['http://localhost:8081'],
  },
  {
    label: 'SonarQube',
    href: fromEnv('VITE_SONARQUBE_URL', 'http://localhost:9000'),
    candidates: ['http://localhost:9000'],
  },
  {
    label: 'Prometheus',
    href: fromEnv('VITE_PROMETHEUS_URL', 'http://localhost:9090'),
    candidates: ['http://localhost:9090', 'http://localhost:9092'],
  },
  {
    label: 'AlertManager',
    href: fromEnv('VITE_ALERTMANAGER_URL', 'http://localhost:9093'),
    candidates: ['http://localhost:9093'],
  },
  {
    label: 'Registry UI',
    href: fromEnv('VITE_REGISTRY_UI_URL', 'http://localhost:8082'),
    candidates: ['http://localhost:8082', 'http://localhost:5001'],
  },
]

async function canReach(url) {
  try {
    await fetch(url, { mode: 'no-cors', cache: 'no-store' })
    return true
  } catch {
    return false
  }
}

export async function openQuickLink(link) {
  const tab = window.open('about:blank', '_blank')
  if (tab) tab.opener = null
  const candidates = [...new Set([link.href, ...(link.candidates ?? [])])]
  const target = candidates.length === 1
    ? candidates[0]
    : (await firstReachable(candidates)) || candidates[0]

  if (tab) {
    tab.location.href = target
  } else {
    window.location.href = target
  }
}

async function firstReachable(candidates) {
  for (const candidate of candidates) {
    if (await canReach(candidate)) return candidate
  }
  return null
}
