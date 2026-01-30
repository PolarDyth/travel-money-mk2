"use client"

import { useEffect } from "react"
import { captureError } from "@/lib/errors"
import { Button } from "@/components/ui/button"
import { Home, RefreshCw } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    captureError(error, { route: "dashboard", errorBoundary: true })
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Dashboard Error
          </h1>
          <p className="text-muted-foreground">
            Something went wrong while loading the dashboard.
          </p>
        </div>

        {error.message && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm font-medium text-destructive">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} variant="default">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button onClick={() => (window.location.href = "/")} variant="outline">
            <Home className="h-4 w-4 mr-2" />
            Go Home
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          This error has been logged. If the problem persists, please contact support.
        </p>
      </div>
    </div>
  )
}
