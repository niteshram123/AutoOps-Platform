const BASE_URL = '/api/jenkins'
const JENKINS_AUTH = `Basic ${btoa('admin:autoops-admin-2024')}`

async function safeFetch(path, options = {}) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        Authorization: JENKINS_AUTH,
        ...(options.headers ?? {}),
      },
    })
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    return res.json()
  } catch (error) {
    console.warn('[Jenkins]', error)
    return null
  }
}

export async function getBuilds(jobName = 'autoops-platform', limit = 10) {
  const result = await safeFetch(`/job/${encodeURIComponent(jobName)}/api/json?tree=builds[number,result,timestamp,duration,displayName,building,actions[parameters[*],causes[*]]]&depth=1`)
  if (!result?.builds) return null
  return result.builds.slice(0, limit)
}

export async function getBuildDetails(jobName, buildNumber) {
  return await safeFetch(`/job/${encodeURIComponent(jobName)}/${buildNumber}/api/json`)
}

export async function getQueueItems() {
  return await safeFetch('/queue/api/json')
}

export async function getJenkinsStats() {
  return await safeFetch('/api/json?tree=jobs[name,color,lastBuild[number,result,timestamp]]')
}

async function getCrumb() {
  return await safeFetch('/crumbIssuer/api/json')
}

export async function triggerBuild(jobName, parameters = {}) {
  const crumb = await getCrumb()
  const body = new URLSearchParams(parameters)
  try {
    const res = await fetch(`${BASE_URL}/job/${encodeURIComponent(jobName)}/build`, {
      method: 'POST',
      headers: {
        Authorization: JENKINS_AUTH,
        'Jenkins-Crumb': crumb?.crumb || '',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })
    if (!res.ok) throw new Error(`triggerBuild failed: ${res.status}`)
    return true
  } catch (error) {
    console.warn('[Jenkins] triggerBuild', error)
    return false
  }
}
