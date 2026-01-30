"use client";

import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, HelpCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="p-4 bg-muted rounded-full">
            <HelpCircle className="h-16 w-16 text-muted-foreground" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            Page Not Found
          </h1>
          <p className="text-muted-foreground text-lg">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        {/* Explanation */}
        <div className="p-4 bg-muted/50 border border-border rounded-md text-left">
          <p className="text-sm text-muted-foreground">
            This may have happened because:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-2 ml-2">
            <li>The URL was typed incorrectly</li>
            <li>The page has been removed or relocated</li>
            <li>You don&apos;t have permission to access this page</li>
            <li>A broken link was followed</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => (window.location.href = "/")} variant="default">
            <Home className="h-4 w-4 mr-2" />
            Go to Home
          </Button>
          <Button onClick={() => window.history.back()} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>

        {/* Help Text */}
        <div className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            Need assistance?
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
            <li>Check the URL and try again</li>
            <li>Contact your supervisor or system administrator</li>
            <li>Use the navigation menu to find what you need</li>
          </ul>
        </div>

        {/* Error Code */}
        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Error Code: <span className="font-mono font-semibold">404</span>
          </p>
        </div>
      </div>
    </div>
  );
}
