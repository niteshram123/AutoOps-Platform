export default function LoadingSpinner({ size = 28 }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
      <svg viewBox="0 0 38 38" style={{ width: size, height: size, animation: 'spin 1s linear infinite' }}>
        <circle cx="19" cy="19" r="16" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
        <path d="M35 19a16 16 0 0 1-16 16" fill="none" stroke="var(--accent-blue)" strokeWidth="4" strokeLinecap="round" />
      </svg>
    </div>
  )
}
