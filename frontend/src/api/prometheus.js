const BASE_URL = '/api/prometheus'

async function fetchPrometheus(path) {
  try {
    const res = await fetch(`${BASE_URL}${path}`)
    if (!res.ok) throw new Error(`Prometheus request failed: ${res.status}`)
    return res.json()
  } catch (error) {
    console.warn('[Prometheus]', error)
    return null
  }
}

export async function queryInstant(promql) {
  const encoded = encodeURIComponent(promql)
  return await fetchPrometheus(`/api/v1/query?query=${encoded}`)
}

export async function queryRange(promql, start, end, step = '15s') {
  const params = new URLSearchParams({
    query: promql,
    start: start.toString(),
    end: end.toString(),
    step,
  })
  const result = await fetchPrometheus(`/api/v1/query_range?${params.toString()}`)
  if (!result || result.status !== 'success') return null
  return result.data.result
}

export const queries = {
  requestRate: `sum(rate(http_requests_total[1m])) by (service)`,
  errorRate: `sum(rate(http_requests_total{status_code=~"5.."}[5m])) by (service) / sum(rate(http_requests_total[5m])) by (service) * 100`,
  p95Latency: `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (service, le)) * 1000`,
  p99Latency: `histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (service, le)) * 1000`,
  availability: `avg(autoops:availability:1h) by (service)`,
  activeUsers: `autoops_active_users_total`,
  serviceHealth: `up{job=~"api-gateway|user-service|metrics-collector|healing-service"}`,

  cpuUsage: `rate(container_cpu_usage_seconds_total{name=~"autoops.*"}[5m]) * 100`,
  memUsage: `container_memory_usage_bytes{name=~"autoops.*"} / 1024 / 1024`,

  errorBudgetRemaining: `(1 - (sum(rate(http_requests_total{status_code=~"5.."}[30d])) / sum(rate(http_requests_total[30d])))) / 0.001 * 100`,

  rpsOverTime: `sum(rate(http_requests_total[1m]))`,
  errorRateOverTime: `sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100`,
  latencyOverTime: `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) * 1000`,
}

export async function getTargets() {
  const result = await fetchPrometheus('/api/v1/targets')
  return result?.data?.activeTargets ?? null
}

export async function getAlertRules() {
  const result = await fetchPrometheus('/api/v1/rules')
  return result?.data?.groups ?? null
}
