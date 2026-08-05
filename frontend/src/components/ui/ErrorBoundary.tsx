'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary — catches unhandled render errors anywhere in the
 * component tree and shows a friendly recovery UI instead of a blank page.
 *
 * Must be a class component because React only supports error boundaries
 * via componentDidCatch / getDerivedStateFromError lifecycle methods.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // In production you'd send this to an error reporting service (Sentry, etc.)
    console.error('[ErrorBoundary] Uncaught error:', error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          role="alert"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 300,
            padding: 40,
            textAlign: 'center',
          }}
        >
          <div style={{ marginBottom: 12, color: '#d97706' }}>
            <svg width="48" height="48" viewBox="0 0 16 16" fill="none" style={{ display: 'block' }}>
              <path d="M8 1.5L15 13.5H1L8 1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
              <path d="M8 6V9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <circle cx="8" cy="11.5" r="0.7" fill="currentColor"/>
            </svg>
          </div>
          <div style={{
            fontFamily: 'var(--font-head)',
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--text)',
            marginBottom: 8,
          }}>
            Something went wrong
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, maxWidth: 360 }}>
            {this.state.error?.message || 'An unexpected error occurred in this section.'}
          </div>
          <button
            type="button"
            onClick={this.handleRetry}
            style={{
              background: 'var(--emerald-600)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 24px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
