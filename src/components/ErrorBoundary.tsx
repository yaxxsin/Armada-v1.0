import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

type ErrorBoundaryState = { hasError: boolean; error: Error | null };
type ErrorBoundaryProps = { children?: ReactNode };

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="wrap" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <h2>Terjadi kesalahan</h2>
          <p style={{ color: 'var(--text-dim)', marginBottom: '16px' }}>
            {this.state.error?.message || 'Terjadi kesalahan yang tidak terduga.'}
          </p>
          <button
            className="btn"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
          >
            Muat ulang halaman
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}