"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMultiBranchSummary, type BranchMetric } from "@/lib/queries/manager";

type BranchComparisonProps = {
  onSelectBranch?: (branchId: string) => void;
};

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `£${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `£${(amount / 1000).toFixed(0)}K`;
  }
  return `£${amount.toFixed(0)}`;
}

export function BranchComparison({ onSelectBranch }: BranchComparisonProps) {
  const [branches, setBranches] = useState<BranchMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const data = await getMultiBranchSummary();
      setBranches(data);
      setIsLoading(false);
    }

    fetchData();

    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <Card className="rounded-none border-zinc-200">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
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
          <Building2 className="w-4 h-4" />
          Branch Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        {branches.length === 0 ? (
          <div className="py-8 text-center text-zinc-500">
            <Building2 className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
            <p className="text-sm">No branch data available</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {branches.map((branch) => {
              const isPositive = branch.variance >= 0;
              return (
                <button
                  key={branch.id}
                  onClick={() => onSelectBranch?.(branch.id)}
                  className={cn(
                    "p-4 border text-left transition-colors cursor-pointer hover:bg-zinc-50",
                    isPositive ? "border-green-200" : "border-red-200"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-black">{branch.name}</p>
                      <p className="text-xs text-zinc-500 font-mono">
                        {branch.code}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[10px]",
                        isPositive
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      )}
                    >
                      {isPositive ? (
                        <TrendingUp className="w-3 h-3 mr-1" />
                      ) : (
                        <TrendingDown className="w-3 h-3 mr-1" />
                      )}
                      {Math.abs(branch.variance).toFixed(1)}%
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="text-2xl font-bold text-black">
                        {formatCurrency(branch.totalVolume)}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {branch.transactionCount} transactions
                      </p>
                    </div>

                    <div className="flex gap-4 text-xs">
                      <div>
                        <span className="text-zinc-500">Buy: </span>
                        <span className="font-medium">
                          {formatCurrency(branch.buyVolume)}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Sell: </span>
                        <span className="font-medium">
                          {formatCurrency(branch.sellVolume)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar towards target */}
                  <div className="mt-3">
                    <div className="h-1.5 bg-zinc-100 overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all",
                          isPositive ? "bg-green-500" : "bg-red-500"
                        )}
                        style={{
                          width: `${Math.min(
                            (branch.totalVolume / branch.targetVolume) * 100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-1">
                      Target: {formatCurrency(branch.targetVolume)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
