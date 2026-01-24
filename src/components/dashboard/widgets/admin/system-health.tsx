"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  Monitor,
  AlertTriangle,
  FileCheck,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getSystemHealth, type SystemHealthStats } from "@/lib/queries/admin";

type SystemHealthProps = {
  className?: string;
};

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never";

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function SystemHealth({ className }: SystemHealthProps) {
  const [stats, setStats] = useState<SystemHealthStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const data = await getSystemHealth();
      setStats(data);
      setIsLoading(false);
    }

    fetchData();

    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <Card className={cn("rounded-none border-zinc-200", className)}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const isRateSyncHealthy = stats.lastRateSyncAt
    ? new Date().getTime() - new Date(stats.lastRateSyncAt).getTime() <
      60 * 60 * 1000
    : false;

  return (
    <Card className={cn("rounded-none border-zinc-200", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-600 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            System Health
          </CardTitle>
          <Badge
            variant="secondary"
            className={cn(
              "text-[10px]",
              stats.errorCount24h === 0
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            )}
          >
            {stats.errorCount24h === 0 ? (
              <>
                <CheckCircle className="w-3 h-3 mr-1" />
                Healthy
              </>
            ) : (
              <>
                <AlertCircle className="w-3 h-3 mr-1" />
                {stats.errorCount24h} errors
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* Active Tills */}
          <div className="p-4 border border-zinc-200 bg-zinc-50">
            <div className="flex items-center gap-2 mb-2 text-zinc-600">
              <Monitor className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase">
                Active Tills
              </span>
            </div>
            <p className="text-3xl font-bold text-black">{stats.activeTills}</p>
            <p className="text-xs text-zinc-500 mt-1">System-wide</p>
          </div>

          {/* Pending Alerts */}
          <div
            className={cn(
              "p-4 border",
              stats.pendingAlerts > 0
                ? "border-amber-200 bg-amber-50"
                : "border-green-200 bg-green-50"
            )}
          >
            <div className="flex items-center gap-2 mb-2 text-zinc-600">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase">
                Pending Alerts
              </span>
            </div>
            <p className="text-3xl font-bold text-black">
              {stats.pendingAlerts}
            </p>
            <p className="text-xs text-zinc-500 mt-1">Unresolved</p>
          </div>

          {/* Pending Reconciliations */}
          <div
            className={cn(
              "p-4 border",
              stats.pendingReconciliations > 0
                ? "border-amber-200 bg-amber-50"
                : "border-zinc-200 bg-zinc-50"
            )}
          >
            <div className="flex items-center gap-2 mb-2 text-zinc-600">
              <FileCheck className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase">
                Reconciliations
              </span>
            </div>
            <p className="text-3xl font-bold text-black">
              {stats.pendingReconciliations}
            </p>
            <p className="text-xs text-zinc-500 mt-1">Awaiting approval</p>
          </div>

          {/* Rate Feed Status */}
          <div
            className={cn(
              "p-4 border",
              isRateSyncHealthy
                ? "border-green-200 bg-green-50"
                : "border-red-200 bg-red-50"
            )}
          >
            <div className="flex items-center gap-2 mb-2 text-zinc-600">
              <RefreshCw className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase">Rate Feed</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-3 h-3 rounded-full",
                  isRateSyncHealthy ? "bg-green-500" : "bg-red-500"
                )}
              />
              <span
                className={cn(
                  "text-sm font-semibold",
                  isRateSyncHealthy ? "text-green-700" : "text-red-700"
                )}
              >
                {isRateSyncHealthy ? "Connected" : "Stale"}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Last sync: {formatRelativeTime(stats.lastRateSyncAt)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
