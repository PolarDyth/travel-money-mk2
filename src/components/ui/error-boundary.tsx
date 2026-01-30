"use client"

import React from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Home, RefreshCw } from "lucide-react"
import { captureError } from "@/lib/errors"

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  showRetry?: boolean
  showHome?: boolean
  customMessage?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to Sentry
    captureError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true
    })

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)

    this.setState({
      error
    })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      const { error } = this.state

      return (
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <Alert variant="destructive" className="max-w-md">
            <AlertTitle className="text-lg font-semibold mb-2 flex items-center gap-2">
              Something went wrong
            </AlertTitle>
            <AlertDescription className="text-sm mb-4">
              {this.props.customMessage || (
                <>
                  {error && (
                    <p className="mb-2">{error.message}</p>
                  )}
                  <p className="text-slate-600 dark:text-slate-400">
                    An unexpected error occurred. This has been logged and will be reviewed.
                  </p>
                </>
              )}
            </AlertDescription>
            <div className="flex flex-wrap gap-2">
              {this.props.showRetry !== false && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={this.handleRetry}
                  className="h-9"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              )}
              {this.props.showHome !== false && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => (window.location.href = "/")}
                  className="h-9"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              )}
            </div>
          </Alert>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook version for functional components
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null)

  const handleError = React.useCallback((err: Error) => {
    setError(err)
    captureError(err, { useErrorHandler: true })
  }, [])

  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  return {
    error,
    handleError,
    resetError,
    hasError: error !== null
  }
}
