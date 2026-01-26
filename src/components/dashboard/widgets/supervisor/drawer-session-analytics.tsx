"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Monitor, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getDrawerSessionAnalytics,
  type DrawerSessionAnalytics,
} from "@/lib/queries/supervisor";

const formatCurrency = (amount: number) =>
  amount.toLocaleString("en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const formatDuration = (minutes: number) => {
  if (!minutes || Number.isNaN(minutes)) return "0m";
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

type DrawerSessionAnalyticsProps = {
  branchId: string;
};

export function DrawerSessionAnalytics({ branchId }: DrawerSessionAnalyticsProps) {
  const [analytics, setAnalytics] = useState<DrawerSessionAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      setIsLoading(true);
      const data = await getDrawerSessionAnalytics(branchId);
      setAnalytics(data);
      setIsLoading(false);
    }

    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, [branchId]);

  if (isLoading) {
    return (
      <Card className="rounded-none border-zinc-200">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-32" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return null;
  }

  const { summary, activeSessions } = analytics;

  return (
    <Card className="rounded-none border-zinc-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-600 flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            Drawer Sessions
          </CardTitle>
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            {summary.openCount} Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Active" value={summary.openCount} />
          <Stat label="Suspended" value={summary.suspendedCount} />
          <Stat label="Closed Today" value={summary.closedCount} />
          <Stat label="Avg Session" value={formatDuration(summary.avgDurationMinutes)} />
          <Stat label="Avg Open" value={formatDuration(summary.avgOpenDurationMinutes)} />
          <Stat label="Variance" value={`£${formatCurrency(summary.totalVariance)}`} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-600">
            <Clock className="w-3 h-3" />
            Active Sessions
          </div>
          {activeSessions.length === 0 ? (
            <div className="py-4 text-center text-zinc-500 text-sm">
              No active drawer sessions
            </div>
          ) : (
            <div className="space-y-2">
              {activeSessions.map((session) => {
                const operator = session.operator
                  ? `${session.operator.first_name} ${session.operator.last_name ?? ""}`.trim()
                  : "Unknown";
                return (
                  <div
                    key={session.id}
                    className="flex items-center justify-between border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">Till {session.till_number ?? "?"}</p>
                      <p className="text-xs text-zinc-500">{operator}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="flex items-center gap-1 text-xs text-zinc-500">
                        <Timer className="w-3 h-3" />
                        {formatDuration(
                          Math.max(
                            0,
                            (Date.now() - new Date(session.opened_at).getTime()) / 60000
                          )
                        )}
                      </div>
                      <p className="text-xs text-zinc-600 tabular-nums">
                        Float £{formatCurrency(Number(session.opening_float_gbp ?? 0))}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className={cn("border border-zinc-200 bg-white p-3")}> 
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className="text-lg font-semibold text-black tabular-nums">{value}</p>
    </div>
  );
}
