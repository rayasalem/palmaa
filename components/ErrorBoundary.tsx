import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Optional fallback UI; defaults to a simple message + reload button */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global Error Boundary – catches render errors in the tree and shows a fallback
 * instead of blanking the app. Production-safe; no logic or data flow change.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (typeof console !== 'undefined' && console.error) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6" role="alert">
          <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-lg p-8 text-center">
            <p className="text-slate-600 font-medium mb-4">
              حدث خطأ غير متوقع. يرجى تحديث الصفحة والمحاولة مرة أخرى.
            </p>
            <p className="text-slate-400 text-sm mb-6">
              Something went wrong. Please refresh the page and try again.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-palma-primary text-white font-bold rounded-xl hover:bg-palma-primaryHover transition-colors"
            >
              تحديث الصفحة / Refresh
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
