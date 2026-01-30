"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileCheck, Check, Flag, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getPendingReconciliations,
  approveReconciliation,
  type ReconciliationItem,
} from "@/lib/queries/manager";

type ReconciliationQueueProps = {
  managerId: string;
  varianceThreshold?: number; // Percentage threshold for auto-approve
  onInvestigate?: (reconciliationId: string) => void;
};

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export function ReconciliationQueue({
  managerId,
  varianceThreshold = 1,
  onInvestigate,
}: ReconciliationQueueProps) {
  const [items, setItems] = useState<ReconciliationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);

  const [, startTransition] = useTransition();

  const fetchData = useCallback(async () => {
    const data = await getPendingReconciliations();
    startTransition(() => {
      setItems(data);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    fetchData();

    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData, setIsLoading]);

  const handleApprove = async (id: string) => {
    setApproving(id);
    const result = await approveReconciliation(id, managerId);
    if (result.success) {
      await fetchData();
    }
    setApproving(null);
  };

  const getVarianceStatus = (
    expected: number,
    actual: number
  ): { status: "good" | "warning" | "error"; percent: number } => {
    const variance = actual - expected;
    const percentVariance = expected > 0 ? (Math.abs(variance) / expected) * 100 : 0;

    if (percentVariance <= varianceThreshold) {
      return { status: "good", percent: percentVariance };
    }
    if (percentVariance <= 5) {
      return { status: "warning", percent: percentVariance };
    }
    return { status: "error", percent: percentVariance };
  };

  if (isLoading) {
    return (
      <Card className="rounded-none border-zinc-200">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-none border-zinc-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-600 flex items-center gap-2">
            <FileCheck className="w-4 h-4" />
            Reconciliation Queue
          </CardTitle>
          {items.length > 0 && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-700">
              {items.length} Pending
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="py-6 text-center text-zinc-500">
            <Check className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p className="text-sm font-medium text-green-700">All clear</p>
            <p className="text-xs text-zinc-500">No pending reconciliations</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[350px] overflow-y-auto">
            {items.map((item) => {
              const expected = Number(item.expected_cash_gbp ?? 0);
              const actual = Number(item.actual_cash_gbp ?? 0);
              const variance = actual - expected;
              const { status, percent } = getVarianceStatus(expected, actual);
              const isApproving = approving === item.id;
              const canAutoApprove = status === "good";

              return (
                <div
                  key={item.id}
                  className={cn(
                    "p-3 border transition-opacity",
                    status === "good" && "border-green-200 bg-green-50/50",
                    status === "warning" && "border-amber-200 bg-amber-50/50",
                    status === "error" && "border-red-200 bg-red-50/50",
                    isApproving && "opacity-50"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-black">
                        {item.branch?.name ?? "Unknown Branch"}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatDate(item.reconciliation_date)}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[10px]",
                        status === "good" && "bg-green-100 text-green-700",
                        status === "warning" && "bg-amber-100 text-amber-700",
                        status === "error" && "bg-red-100 text-red-700"
                      )}
                    >
                      {status === "error" && (
                        <AlertTriangle className="w-3 h-3 mr-1" />
                      )}
                      {percent.toFixed(2)}% variance
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                    <div>
                      <p className="text-zinc-500">Expected</p>
                      <p className="font-mono font-medium">
                        £{formatCurrency(expected)}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Actual</p>
                      <p className="font-mono font-medium">
                        £{formatCurrency(actual)}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Variance</p>
                      <p
                        className={cn(
                          "font-mono font-medium",
                          variance >= 0 ? "text-green-600" : "text-red-600"
                        )}
                      >
                        {variance >= 0 ? "+" : ""}£{formatCurrency(variance)}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {canAutoApprove ? (
                      <Button
                        size="sm"
                        className="h-7 text-xs cursor-pointer rounded-none bg-green-600 hover:bg-green-700"
                        onClick={() => handleApprove(item.id)}
                        disabled={isApproving}
                      >
                        {isApproving ? (
                          "..."
                        ) : (
                          <>
                            <Check className="w-3 h-3 mr-1" />
                            Approve
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs cursor-pointer rounded-none"
                        onClick={() => handleApprove(item.id)}
                        disabled={isApproving}
                      >
                        {isApproving ? "..." : "Override Approve"}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs cursor-pointer"
                      onClick={() => onInvestigate?.(item.id)}
                    >
                      <Flag className="w-3 h-3 mr-1" />
                      Investigate
                    </Button>
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
