"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw, XCircle } from "lucide-react"
import { useState } from "react"
import { AppError } from "@/lib/types/response"

interface ErrorAlertProps {
  error?: AppError
  onRetry?: () => void
  onDismiss?: () => void
  showTechnicalDetails?: boolean
}

export function ErrorAlert({
  error,
  onRetry,
  onDismiss,
  showTechnicalDetails = false
}: ErrorAlertProps) {
  const [showDetails, setShowDetails] = useState(false)

  if (!error) {
    return null
  }

  // Determine icon based on error type
  const isErrorIcon = error.code === "INTERNAL_ERROR"

  return (
    <Alert variant="destructive" className="relative">
      <div className="flex items-start gap-3">
        {isErrorIcon ? (
          <XCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
        ) : (
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
        )}
        <div className="flex-1">
          <AlertTitle className="text-base font-semibold mb-1">
            Error
          </AlertTitle>
          <AlertDescription className="text-sm mb-3">
            {error.userMessage}
          </AlertDescription>

          <div className="flex flex-wrap gap-2">
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="h-8"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            )}
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="h-8"
              >
                Dismiss
              </Button>
            )}
            {showTechnicalDetails && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="h-8"
              >
                {showDetails ? "Hide Details" : "Show Details"}
              </Button>
            )}
          </div>

          {showDetails && showTechnicalDetails && (
            <div className="mt-4 p-3 bg-slate-950 dark:bg-slate-900 rounded border border-slate-800">
              <p className="text-xs font-mono text-slate-300 mb-2">
                Code: <span className="text-slate-100">{error.code}</span>
              </p>
              <p className="text-xs font-mono text-slate-300">
                Message: <span className="text-slate-100">{error.message}</span>
              </p>
              {error.details && Object.keys(error.details).length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs cursor-pointer text-slate-400 hover:text-slate-300">
                    Additional Details
                  </summary>
                  <pre className="mt-2 text-xs text-slate-400 overflow-x-auto">
                    {JSON.stringify(error.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>
      </div>
    </Alert>
  )
}
