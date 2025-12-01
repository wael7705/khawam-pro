import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('❌ ErrorBoundary caught an error:', error, errorInfo)
    this.setState({
      error,
      errorInfo,
    })

    // محاولة إعادة تحميل الصفحة إذا كان الخطأ متعلقاً بتحميل الـ chunks
    if (
      error.message.includes('Failed to fetch') ||
      error.message.includes('ERR_CONNECTION_RESET') ||
      error.message.includes('Loading chunk') ||
      error.message.includes('ChunkLoadError')
    ) {
      console.log('🔄 Chunk loading error detected, reloading page...')
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    }
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            padding: '20px',
            textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.05), rgba(239, 68, 68, 0.05))',
          }}
        >
          <div
            style={{
              background: 'white',
              padding: '40px',
              borderRadius: '20px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
              maxWidth: '600px',
            }}
          >
            <h1 style={{ color: '#dc2626', fontSize: '2rem', marginBottom: '20px' }}>
              حدث خطأ
            </h1>
            <p style={{ color: '#666', marginBottom: '30px', lineHeight: '1.6' }}>
              حدث خطأ أثناء تحميل التطبيق. يرجى المحاولة مرة أخرى.
            </p>
            <button
              onClick={this.handleReload}
              style={{
                background: 'linear-gradient(135deg, #dc2626, #ef4444)',
                color: 'white',
                border: 'none',
                padding: '15px 40px',
                borderRadius: '50px',
                fontSize: '1.1rem',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(220, 38, 38, 0.3)',
                transition: 'all 0.3s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)'
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(220, 38, 38, 0.4)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(220, 38, 38, 0.3)'
              }}
            >
              إعادة تحميل الصفحة
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details
                style={{
                  marginTop: '30px',
                  padding: '20px',
                  background: '#f5f5f5',
                  borderRadius: '10px',
                  textAlign: 'left',
                }}
              >
                <summary style={{ cursor: 'pointer', fontWeight: '600', marginBottom: '10px' }}>
                  تفاصيل الخطأ (للتطوير فقط)
                </summary>
                <pre
                  style={{
                    overflow: 'auto',
                    fontSize: '0.85rem',
                    color: '#333',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

