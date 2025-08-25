import React, { Component, ErrorInfo, ReactNode } from 'react';
import AuthenticationErrorPage from './AuthenticationErrorPage';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if this is an authentication-related error
    const isAuthError = error.message.includes('authentication') || 
                       error.message.includes('auth') ||
                       error.message.includes('Too many authentication attempts');
    
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('GlobalErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Log to error reporting service if you have one
    // logErrorToService(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    
    // Optionally reload the page
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Check if this is an authentication error
      const isAuthError = this.state.error?.message.includes('authentication') || 
                         this.state.error?.message.includes('auth') ||
                         this.state.error?.message.includes('Too many authentication attempts');

      if (isAuthError) {
        // Show the authentication error page
        return (
          <AuthenticationErrorPage
            error={{
              error: 'authentication_error',
              message: this.state.error?.message || 'Authentication error occurred',
              retryAfter: 0
            }}
            onRetry={this.handleRetry}
          />
        );
      }

      // For other errors, show a generic error page
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Something went wrong
            </h1>
            <p className="text-gray-600 mb-6">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <button
              onClick={this.handleRetry}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
