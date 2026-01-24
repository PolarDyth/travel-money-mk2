"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, ArrowRightLeft, Banknote, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBranchSummary, type BranchSummary as BranchSummaryType } from "@/lib/queries/supervisor";

type BranchSummaryProps = {
  branchId: string;
};

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function BranchSummary({ branchId }: BranchSummaryProps) {
  const [summary, setSummary] = useState<BranchSummaryType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSummary() {
      setIsLoading(true);
      const data = await getBranchSummary(branchId);
      setSummary(data);
      setIsLoading(false);
    }

    fetchSummary();

    // Refresh every minute
    const interval = setInterval(fetchSummary, 60000);
    return () => clearInterval(interval);
  }, [branchId]);

  if (isLoading) {
    return (
      <Card className="rounded-none border-zinc-200">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-16" />
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return null;
  }

  const totalVolume = summary.totalBuy + summary.totalSell;
  const changePercent =
    summary.yesterdayTotal > 0
      ? ((totalVolume - summary.yesterdayTotal) / summary.yesterdayTotal) * 100
      : 0;
  const isPositive = changePercent >= 0;

  return (
    <Card className="rounded-none border-zinc-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-600">
          Today&apos;s Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Volume */}
        <div className="p-3 bg-black text-white">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[#C5A065] uppercase font-semibold">
              Total Volume
            </span>
            <div
              className={cn(
                "flex items-center gap-1 text-xs",
                isPositive ? "text-green-400" : "text-red-400"
              )}
            >
              {isPositive ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {Math.abs(changePercent).toFixed(1)}% vs yesterday
            </div>
          </div>
          <p className="text-2xl font-bold">£{formatCurrency(totalVolume)}</p>
          <p className="text-xs text-zinc-400 mt-1">
            {summary.transactionCount} transactions
          </p>
        </div>

        {/* Buy/Sell Breakdown */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 border border-zinc-200 bg-zinc-50">
            <div className="flex items-center gap-2 mb-2">
              <ArrowRightLeft className="w-4 h-4 text-[#C5A065]" />
              <span className="text-xs text-zinc-600 font-semibold uppercase">
                Buy Volume
              </span>
            </div>
            <p className="text-lg font-bold">£{formatCurrency(summary.totalBuy)}</p>
            <p className="text-xs text-zinc-500">{summary.buyCount} transactions</p>
          </div>

          <div className="p-3 border border-zinc-200 bg-zinc-50">
            <div className="flex items-center gap-2 mb-2">
              <Banknote className="w-4 h-4 text-black" />
              <span className="text-xs text-zinc-600 font-semibold uppercase">
                Sell Volume
              </span>
            </div>
            <p className="text-lg font-bold">£{formatCurrency(summary.totalSell)}</p>
            <p className="text-xs text-zinc-500">{summary.sellCount} transactions</p>
          </div>
        </div>

        {/* Commission */}
        <div className="p-3 border border-[#C5A065] bg-[#C5A065]/10">
          <div className="flex items-center gap-2 mb-1">
            <Coins className="w-4 h-4 text-[#C5A065]" />
            <span className="text-xs text-zinc-700 font-semibold uppercase">
              Commission Earned
            </span>
          </div>
          <p className="text-xl font-bold text-black">
            £{formatCurrency(summary.commission)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
