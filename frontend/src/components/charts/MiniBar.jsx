export default function MiniBar({ value = 0, max = 100, color = '#38bdf8', height = 8 }) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  return (
    <div style={{ width: '100%', height, borderRadius: 999, background: 'rgba(148, 163, 184, 0.12)', overflow: 'hidden' }}>
      <div style={{ width: `${percentage}%`, height: '100%', borderRadius: 999, background: color, transition: 'width 0.4s ease' }} />
    </div>
  )
}
