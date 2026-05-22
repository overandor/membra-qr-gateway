import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background-50 flex items-center justify-center p-6">
          <div className="glass-card p-8 max-w-2xl w-full text-center">
            <AlertTriangle className="w-12 h-12 text-danger mx-auto mb-4" />
            <h2 className="text-xl font-bold text-text-primary mb-2">Something went wrong</h2>
            <p className="text-sm text-text-muted mb-6">
              The application encountered an unexpected error. Check the browser console (F12) for the full stack trace.
            </p>
            <div className="p-3 rounded-lg bg-danger/5 border border-danger/20 mb-4 text-left overflow-auto max-h-40">
              <p className="text-xs text-danger font-mono break-all">
                {this.state.error?.message || 'Unknown error'}
              </p>
            </div>
            {this.state.errorInfo && (
              <div className="p-3 rounded-lg bg-background-100 border border-white/5 mb-6 text-left overflow-auto max-h-60">
                <p className="text-[10px] text-text-muted font-mono whitespace-pre-wrap">
                  {this.state.errorInfo.componentStack}
                </p>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-orange/10 border border-primary-orange/30 text-primary-orange text-sm font-medium hover:bg-primary-orange/20 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
