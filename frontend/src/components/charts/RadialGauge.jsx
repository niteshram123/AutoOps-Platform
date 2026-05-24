export default function RadialGauge({ value = 0, max = 100, label = '', unit = '%', color = '#00ff9d', size = 100 }) {
  const radius = 38
  const circumference = 2 * Math.PI * radius
  const perc = Math.min(Math.max(value / max, 0), 1)
  const dashOffset = circumference * (1 - perc)

  return (
    <div style={{ width: size, minWidth: size, textAlign: 'center' }}>
      <svg width={size} height={size} viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(148, 163, 184, 0.1)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
        <text x="60" y="60" textAnchor="middle" dominantBaseline="central" style={{ fontSize: '1.1rem', fontWeight: 700, fill: 'var(--text-primary)' }}>
          {Math.round(value)}
        </text>
        <text x="60" y="76" textAnchor="middle" dominantBaseline="central" style={{ fontSize: '0.76rem', fill: 'var(--text-muted)' }}>
          {unit}
        </text>
      </svg>
      <div style={{ marginTop: '0.8rem', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.4 }}>{label}</div>
    </div>
  )
}
