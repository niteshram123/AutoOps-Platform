import { Area, CartesianGrid, AreaChart as RechartsAreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

function formatAxis(value) {
  return typeof value === 'number' ? `${Math.round(value)}` : value
}

export default function AreaChart({ data = [], lines = [], height = 240, showGrid = true }) {
  return (
    <div style={{ width: '100%', height, minHeight: height, background: 'transparent' }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsAreaChart data={data} margin={{ top: 20, right: 18, left: 0, bottom: 8 }}>
          {showGrid && <CartesianGrid stroke="rgba(148,163,184,0.14)" strokeDasharray="4 5" />}
          <XAxis dataKey="timestamp" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
          <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatAxis} />
          <Tooltip contentStyle={{ background: 'rgba(15, 23, 42, 0.98)', borderColor: '#1e293b' }} labelFormatter={(value) => new Date(value).toLocaleTimeString()} />
          {lines.map((line) => (
            <Area key={line.key} type="monotone" dataKey={line.key} stroke={line.color} fill={line.color} fillOpacity={0.16} strokeWidth={2.5} dot={false} />
          ))}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  )
}
