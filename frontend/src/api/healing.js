const BASE_URL = '/api/healing'

async function safeFetch(path, options = {}) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, options)
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    return res.json()
  } catch (error) {
    console.warn('[Healing]', error)
    return null
  }
}

export async function getHealingEvents(params = {}) {
  const query = new URLSearchParams({ limit: 20, ...params }).toString()
  return await safeFetch(`/audit/events?${query}`)
}

export async function getHealingSummary() {
  return await safeFetch('/audit/summary')
}

export async function getHealingHealth() {
  return await safeFetch('/health')
}

export async function triggerTestAlert(alertName, service) {
  const payload = {
    version: '4',
    receiver: 'autoops-webhook',
    status: 'firing',
    alerts: [
      {
        status: 'firing',
        labels: {
          alertname: alertName,
          severity: 'critical',
          service,
          namespace: 'autoops-production',
        },
        annotations: {
          summary: `Simulated ${alertName} alert on ${service}`,
          description: `This is a demo-triggered alert for testing the self-healing engine.`,
        },
        startsAt: new Date().toISOString(),
      },
    ],
  }

  try {
    const res = await fetch(`${BASE_URL}/webhook/alert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer autoops-webhook-secret',
      },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`triggerTestAlert failed: ${res.status}`)
    return await res.json()
  } catch (error) {
    console.warn('[Healing] triggerTestAlert', error)
    return null
  }
}
