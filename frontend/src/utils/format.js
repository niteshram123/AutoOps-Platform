/**
 * Shared number formatting utilities for AutoOps Dashboard
 * Use these EVERYWHERE a metric is displayed — never raw numbers
 */

export const formatRPS = (val) => {
  if (val == null || isNaN(val)) return '0.0'
  return Number(val).toFixed(1)
}

export const formatErrorRate = (val) => {
  if (val == null || isNaN(val)) return '0.00%'
  return Number(val).toFixed(2) + '%'
}

export const formatLatency = (val) => {
  if (val == null || isNaN(val)) return '0ms'
  return Math.round(Number(val)) + 'ms'
}

export const formatAvailability = (val) => {
  if (val == null || isNaN(val)) return '99.90%'
  return Number(val).toFixed(2) + '%'
}

export const formatMemory = (val) => {
  if (val == null || isNaN(val)) return '0.0 MB'
  return Number(val).toFixed(1) + ' MB'
}

export const formatCPU = (val) => {
  if (val == null || isNaN(val)) return '0.0%'
  return Number(val).toFixed(1) + '%'
}

export const formatMetric = (val, decimals = 1) => {
  if (val == null || isNaN(val)) return '0'
  return Number(val).toFixed(decimals)
}

export const safeNum = (val, decimals = 2) => {
  const n = Number(val)
  if (isNaN(n)) return '—'
  return n.toFixed(decimals)
}
