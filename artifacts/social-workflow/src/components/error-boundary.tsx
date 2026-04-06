import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-background">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-6">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">
            Something went wrong
          </h1>
          <p className="text-muted-foreground max-w-md mb-2 text-[15px]">
            An unexpected error occurred. Your data is safe.
          </p>
          {this.state.error && (
            <p className="text-xs text-muted-foreground/60 mb-8 font-mono max-w-lg truncate">
              {this.state.error.message}
            </p>
          )}
          <div className="flex gap-3">
            <Button onClick={this.handleReset} variant="outline" className="rounded-xl gap-2">
              <RefreshCw className="w-4 h-4" /> Try Again
            </Button>
            <Button onClick={() => window.location.reload()} className="rounded-xl">
              Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
