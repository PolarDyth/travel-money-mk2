"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, Clock, Hash, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DrawerSession } from "@/types";
import { getActiveDrawerSession, getSessionStats } from "@/lib/queries/operator";

type DrawerStatusProps = {
  operatorId: string;
  onOpenDrawer?: () => void;
  onCountDenominations?: () => void;
};

type SessionStats = {
  transactionCount: number;
  totalBuyVolume: number;
  totalSellVolume: number;
};

function formatDuration(startDate: string): string {
  const start = new Date(startDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getVarianceStatus(
  expected: number,
  actual: number
): "good" | "warning" | "error" {
  const variance = Math.abs(expected - actual);
  const percentVariance = expected > 0 ? (variance / expected) * 100 : 0;

  if (percentVariance < 0.5) return "good";
  if (percentVariance < 2) return "warning";
  return "error";
}

export function DrawerStatus({
  operatorId,
  onOpenDrawer,
  onCountDenominations,
}: DrawerStatusProps) {
  const [session, setSession] = useState<DrawerSession | null>(null);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [duration, setDuration] = useState("");

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const drawerSession = await getActiveDrawerSession(operatorId);
      setSession(drawerSession);

      if (drawerSession) {
        const sessionStats = await getSessionStats(drawerSession.id);
        setStats(sessionStats);
        setDuration(formatDuration(drawerSession.opened_at));
      }
      setIsLoading(false);
    }

    fetchData();
  }, [operatorId]);

  // Update duration every minute
  useEffect(() => {
    if (!session) return;

    const interval = setInterval(() => {
      setDuration(formatDuration(session.opened_at));
    }, 60000);

    return () => clearInterval(interval);
  }, [session]);

  if (isLoading) {
    return (
      <Card className="rounded-none border-zinc-200">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!session) {
    return (
      <Card className="rounded-none border-zinc-200 border-l-4 border-l-amber-500">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <p className="font-semibold text-black">No Active Drawer Session</p>
          </div>
          <p className="text-sm text-zinc-600 mb-4">
            Open a drawer to begin processing transactions.
          </p>
          <Button
            onClick={onOpenDrawer}
            className="w-full bg-black text-white hover:bg-zinc-800 cursor-pointer rounded-none"
          >
            <Wallet className="w-4 h-4 mr-2" />
            Open Drawer
          </Button>
        </CardContent>
      </Card>
    );
  }

  const openingBalance = Number(session.opening_float_gbp ?? 0);
  const expectedBalance = Number(session.expected_float_gbp ?? openingBalance);
  const varianceStatus = getVarianceStatus(expectedBalance, openingBalance + (stats?.totalSellVolume ?? 0) - (stats?.totalBuyVolume ?? 0));

  return (
    <Card className="rounded-none border-zinc-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-600">
            Drawer Session
          </CardTitle>
          <Badge
            variant="secondary"
            className="bg-green-100 text-green-700 rounded-none"
          >
            Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Session Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-400" />
            <div>
              <p className="text-xs text-zinc-500">Opened</p>
              <p className="font-medium">{formatTime(session.opened_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-zinc-400" />
            <div>
              <p className="text-xs text-zinc-500">Duration</p>
              <p className="font-medium">{duration}</p>
            </div>
          </div>
        </div>

        {/* Balance Display */}
        <div
          className={cn(
            "p-3 border",
            varianceStatus === "good" && "bg-green-50 border-green-200",
            varianceStatus === "warning" && "bg-amber-50 border-amber-200",
            varianceStatus === "error" && "bg-red-50 border-red-200"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-600 uppercase">
              Current Balance
            </span>
            <span
              className={cn(
                "text-xs font-medium",
                varianceStatus === "good" && "text-green-600",
                varianceStatus === "warning" && "text-amber-600",
                varianceStatus === "error" && "text-red-600"
              )}
            >
              {varianceStatus === "good" && "On Track"}
              {varianceStatus === "warning" && "Minor Variance"}
              {varianceStatus === "error" && "Check Required"}
            </span>
          </div>
          <p className="text-2xl font-bold text-black">
            £{expectedBalance.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Opening: £{openingBalance.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Session Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-zinc-50 border border-zinc-100">
              <p className="text-xs text-zinc-500">Transactions</p>
              <p className="font-bold text-lg">{stats.transactionCount}</p>
            </div>
            <div className="p-2 bg-zinc-50 border border-zinc-100">
              <p className="text-xs text-zinc-500">Buy Vol</p>
              <p className="font-medium text-sm">
                £{stats.totalBuyVolume.toLocaleString("en-GB", { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="p-2 bg-zinc-50 border border-zinc-100">
              <p className="text-xs text-zinc-500">Sell Vol</p>
              <p className="font-medium text-sm">
                £{stats.totalSellVolume.toLocaleString("en-GB", { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        )}

        {/* Quick Action */}
        <Button
          variant="outline"
          onClick={onCountDenominations}
          className="w-full cursor-pointer rounded-none border-zinc-300 hover:bg-zinc-50"
        >
          Count Denominations
        </Button>
      </CardContent>
    </Card>
  );
}
