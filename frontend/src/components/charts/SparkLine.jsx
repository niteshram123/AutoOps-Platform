import { memo } from 'react'

function buildPath(data, height, width) {
  if (!data.length) return ''
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  return data.map((value, index) => {
    const x = (index / (data.length - 1)) * width
    const y = height - ((value - min) / range) * height
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
  }).join(' ')
}

export default memo(function SparkLine({ data = [], color = '#38bdf8', height = 40, fill = false, showDot = true }) {
  const width = 160
  const values = data.map((item) => (typeof item === 'number' ? item : item.value ?? 0)).slice(-20)
  const path = buildPath(values, height, width)
  const last = values[values.length - 1] ?? 0

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', display: 'block', overflow: 'visible' }}>
      {fill && (
        <path d={`${path} L ${width} ${height} L 0 ${height} Z`} fill={`${color}22`} />
      )}
      <path d={path} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke-dashoffset 0.35s ease' }} />
      {showDot && <circle cx={width - 1} cy={height - ((last - Math.min(...values)) / (Math.max(...values) - Math.min(...values) || 1)) * height} r="3.2" fill={color} />}
    </svg>
  )
})
