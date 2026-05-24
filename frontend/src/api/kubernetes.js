const BASE_URL = 'http://localhost:8001'

async function safeFetch(path, options = {}) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, options)
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    return res.json()
  } catch (error) {
    console.warn('[Kubernetes]', error)
    return null
  }
}

export async function getPods(namespace = 'autoops-staging') {
  return await safeFetch(`/api/v1/namespaces/${encodeURIComponent(namespace)}/pods`)
}

export async function getDeployments(namespace = 'autoops-staging') {
  return await safeFetch(`/apis/apps/v1/namespaces/${encodeURIComponent(namespace)}/deployments`)
}

export async function getHPAs(namespace = 'autoops-staging') {
  return await safeFetch(`/apis/autoscaling/v2/namespaces/${encodeURIComponent(namespace)}/horizontalpodautoscalers`)
}

export async function getNamespaces() {
  return await safeFetch('/api/v1/namespaces?labelSelector=project%3Dautoops')
}

export async function getEvents(namespace = 'autoops-staging') {
  return await safeFetch(`/api/v1/namespaces/${encodeURIComponent(namespace)}/events?fieldSelector=type%3DWarning`)
}
