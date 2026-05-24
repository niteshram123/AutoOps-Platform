import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', borderRadius: '1rem', background: 'rgba(255, 77, 109, 0.08)', border: '1px solid rgba(255, 77, 109, 0.16)' }}>
          <h2 style={{ color: '#ffb3bd', marginBottom: '0.75rem' }}>Something went wrong.</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Reload the page or try again later. If this persists, check the browser console for details.</p>
        </div>
      )
    }

    return this.props.children
  }
}
