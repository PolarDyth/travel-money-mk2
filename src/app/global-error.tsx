"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Home, RefreshCw, AlertTriangle } from "lucide-react";

interface ErrorWithCode extends Error {
  digest?: string;
  code?: string;
}

export default function GlobalError({
  error,
}: {
  error: ErrorWithCode;
}) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  // Extract error code if available (for custom errors)
  const errorCode = error.code || "UNKNOWN";

  return (
    <html lang="en">
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
          <div className="max-w-lg w-full space-y-8 text-center">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="p-4 bg-destructive/10 rounded-full">
                <AlertTriangle className="h-12 w-12 text-destructive" />
              </div>
            </div>

            {/* Error Title */}
            <h1 className="text-3xl font-bold tracking-tight">
              Something went wrong
            </h1>

            {/* Error Message */}
            <div className="space-y-2">
              {error.message && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md text-left">
                  <p className="text-sm font-medium text-destructive">
                    {error.message}
                  </p>
                </div>
              )}
              <p className="text-muted-foreground">
                An unexpected error occurred. This has been logged and our team has been notified.
              </p>
            </div>

            {/* Error Code Display */}
            {errorCode && errorCode !== "UNKNOWN" && (
              <div className="text-xs text-muted-foreground font-mono">
                Error Code: <span className="font-semibold">{errorCode}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => window.location.reload()} variant="default">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Page
              </Button>
              <Button onClick={() => (window.location.href = "/")} variant="outline">
                <Home className="h-4 w-4 mr-2" />
                Go to Home
              </Button>
            </div>

            {/* Expandable Technical Details */}
            {error.digest && (
              <details className="text-left">
                <summary
                  onClick={(e) => {
                    e.preventDefault()
                    setShowDetails(!showDetails)
                  }}
                  className="text-sm cursor-pointer text-muted-foreground hover:text-foreground select-none"
                >
                  Technical Details
                </summary>
                {showDetails && (
                  <div className="mt-4 p-4 bg-slate-950 dark:bg-slate-900 rounded border border-slate-800">
                    <p className="text-xs font-mono text-slate-300 mb-2">
                      Error Digest: <span className="text-slate-100">{error.digest}</span>
                    </p>
                    {error.stack && (
                      <details className="mt-2">
                        <summary className="text-xs cursor-pointer text-slate-400 hover:text-slate-300">
                          Stack Trace
                        </summary>
                        <pre className="mt-2 text-xs text-slate-400 overflow-x-auto">
                          {error.stack}
                        </pre>
                      </details>
                    )}
                  </div>
                )}
              </details>
            )}

            {/* Help Text */}
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                If this problem persists, please:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                <li>Try refreshing the page</li>
                <li>Check your internet connection</li>
                <li>Contact your system administrator with the error code above</li>
              </ul>
            </div>

            {/* Support Information */}
            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Reference ID: <span className="font-mono">{error.digest}</span>
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
