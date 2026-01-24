"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Check, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPendingAlerts, acknowledgeAlert } from "@/lib/queries/supervisor";
import type { ComplianceAlert } from "@/types";

type PendingAlertsProps = {
  branchId: string;
  userId: string;
  onViewTransaction?: (transactionId: string) => void;
};

const SEVERITY_CONFIG: Record<
  string,
  { label: string; color: string; priority: number }
> = {
  critical: { label: "Critical", color: "bg-red-100 text-red-700 border-red-200", priority: 1 },
  high: { label: "High", color: "bg-orange-100 text-orange-700 border-orange-200", priority: 2 },
  medium: { label: "Medium", color: "bg-amber-100 text-amber-700 border-amber-200", priority: 3 },
  low: { label: "Low", color: "bg-blue-100 text-blue-700 border-blue-200", priority: 4 },
};

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  return date.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
}

export function PendingAlerts({
  branchId,
  userId,
  onViewTransaction,
}: PendingAlertsProps) {
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    const data = await getPendingAlerts(branchId);
    setAlerts(data);
    setIsLoading(false);
  }, [branchId]);

  useEffect(() => {
    fetchAlerts();

    // Refresh every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const handleAcknowledge = async (alertId: string) => {
    setAcknowledging(alertId);
    const result = await acknowledgeAlert(alertId, userId);
    if (result.success) {
      await fetchAlerts();
    }
    setAcknowledging(null);
  };

  if (isLoading) {
    return (
      <Card className="rounded-none border-zinc-200">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-28" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const highCount = alerts.filter((a) => a.severity === "high").length;

  return (
    <Card className="rounded-none border-zinc-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-600 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Pending Alerts
          </CardTitle>
          {alerts.length > 0 && (
            <div className="flex gap-1">
              {criticalCount > 0 && (
                <Badge variant="secondary" className="bg-red-100 text-red-700 text-[10px]">
                  {criticalCount} Critical
                </Badge>
              )}
              {highCount > 0 && (
                <Badge variant="secondary" className="bg-orange-100 text-orange-700 text-[10px]">
                  {highCount} High
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="py-6 text-center text-zinc-500">
            <Check className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p className="text-sm font-medium text-green-700">All clear</p>
            <p className="text-xs text-zinc-500">No pending alerts</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {alerts.map((alert) => {
              const config = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.low;
              const isAcknowledging = acknowledging === alert.id;

              return (
                <div
                  key={alert.id}
                  className={cn(
                    "p-3 border-l-4 bg-zinc-50 transition-opacity",
                    alert.severity === "critical" && "border-l-red-500",
                    alert.severity === "high" && "border-l-orange-500",
                    alert.severity === "medium" && "border-l-amber-500",
                    alert.severity === "low" && "border-l-blue-500",
                    isAcknowledging && "opacity-50"
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="outline"
                          className={cn("text-[10px]", config.color)}
                        >
                          {config.label}
                        </Badge>
                        <span className="text-[10px] text-zinc-500">
                          {formatTime(alert.created_at)}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-black truncate">
                        {alert.alert_type}
                      </p>
                      <p className="text-xs text-zinc-600 line-clamp-2">
                        {alert.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs cursor-pointer rounded-none"
                      onClick={() => handleAcknowledge(alert.id)}
                      disabled={isAcknowledging}
                    >
                      {isAcknowledging ? (
                        "..."
                      ) : (
                        <>
                          <Check className="w-3 h-3 mr-1" />
                          Acknowledge
                        </>
                      )}
                    </Button>
                    {alert.transaction_id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs cursor-pointer"
                        onClick={() => onViewTransaction?.(alert.transaction_id!)}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View TXN
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
