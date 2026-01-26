"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { getOperatorMetrics, type OperatorMetric } from "@/lib/queries/supervisor";

type OperatorMetricsProps = {
  branchId: string;
};

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function getVoidRateStatus(rate: number): "good" | "warning" | "error" {
  if (rate < 2) return "good";
  if (rate < 5) return "warning";
  return "error";
}

export function OperatorMetrics({ branchId }: OperatorMetricsProps) {
  const [metrics, setMetrics] = useState<OperatorMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const initialLoadRef = useRef(true);

  useEffect(() => {
    async function fetchMetrics() {
      if (initialLoadRef.current) {
        setIsLoading(true);
      }
      const data = await getOperatorMetrics(branchId);
      setMetrics(data);
      if (initialLoadRef.current) {
        setIsLoading(false);
        initialLoadRef.current = false;
      }
    }

    fetchMetrics();

    // Refresh every 2 minutes
    const interval = setInterval(fetchMetrics, 120000);
    return () => clearInterval(interval);
  }, [branchId]);

  if (isLoading) {
    return (
      <Card className="rounded-none border-zinc-200">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-none border-zinc-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-600 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Operator Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        {metrics.length === 0 ? (
          <div className="py-6 text-center text-zinc-500">
            <Users className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
            <p className="text-sm">No operator data today</p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 px-2 py-1 text-[10px] font-semibold text-zinc-500 uppercase border-b border-zinc-200">
              <div className="col-span-4">Operator</div>
              <div className="col-span-2 text-right">TXNs</div>
              <div className="col-span-2 text-right">Volume</div>
              <div className="col-span-2 text-right">Avg</div>
              <div className="col-span-2 text-right">Void %</div>
            </div>

            {/* Rows */}
            {metrics.map((metric) => {
              const voidStatus = getVoidRateStatus(metric.voidRate);
              return (
                <div
                  key={metric.id}
                  className="grid grid-cols-12 gap-2 px-2 py-2 text-sm hover:bg-zinc-50 transition-colors items-center"
                >
                  <div className="col-span-4 font-medium truncate">
                    {metric.firstName} {metric.lastName.charAt(0)}.
                  </div>
                  <div className="col-span-2 text-right tabular-nums">
                    {metric.transactionCount}
                  </div>
                  <div className="col-span-2 text-right tabular-nums text-xs">
                    £{formatCurrency(metric.totalVolume)}
                  </div>
                  <div className="col-span-2 text-right tabular-nums text-xs text-zinc-500">
                    £{formatCurrency(metric.avgTransactionValue)}
                  </div>
                  <div className="col-span-2 text-right">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[10px] px-1.5",
                        voidStatus === "good" && "bg-green-100 text-green-700",
                        voidStatus === "warning" && "bg-amber-100 text-amber-700",
                        voidStatus === "error" && "bg-red-100 text-red-700"
                      )}
                    >
                      {metric.voidRate.toFixed(1)}%
                    </Badge>
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
