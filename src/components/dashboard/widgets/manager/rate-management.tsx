"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Edit, History, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getGlobalRatesWithOverrides, type RateWithOverride } from "@/lib/queries/manager";

type RateManagementProps = {
  onEditRate?: (currencyId: string) => void;
  onEditSettings?: (currencyId: string) => void;
  onViewHistory?: (currencyId: string) => void;
};

export function RateManagement({
  onEditRate,
  onEditSettings,
  onViewHistory,
}: RateManagementProps) {
  const [rates, setRates] = useState<RateWithOverride[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const data = await getGlobalRatesWithOverrides();
      setRates(data);
      setIsLoading(false);
    }

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <Card className="rounded-none border-zinc-200">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Take top 6 most important rates
  const displayRates = rates.slice(0, 6);

  return (
    <Card className="rounded-none border-zinc-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-600 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Rate Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        {displayRates.length === 0 ? (
          <div className="py-6 text-center text-zinc-500">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
            <p className="text-sm">No active rates</p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 px-2 py-1 text-[10px] font-semibold text-zinc-500 uppercase border-b border-zinc-200">
              <div className="col-span-3">Currency</div>
              <div className="col-span-2 text-right">Buy</div>
              <div className="col-span-2 text-right">Sell</div>
              <div className="col-span-2 text-center">Status</div>
              <div className="col-span-3 text-right">Actions</div>
            </div>

            {/* Rows */}
            {displayRates.map((rate) => (
              <div
                key={rate.id}
                className={cn(
                  "grid grid-cols-12 gap-2 px-2 py-2 text-sm items-center",
                  rate.hasOverride && "bg-amber-50"
                )}
              >
                <div className="col-span-3">
                  <span className="font-semibold">{rate.currencyCode}</span>
                  <span className="text-xs text-zinc-500 ml-1 hidden sm:inline">
                    {rate.currencyName}
                  </span>
                </div>
                <div className="col-span-2 text-right font-mono text-xs">
                  {Number(rate.buy_rate).toFixed(4)}
                </div>
                <div className="col-span-2 text-right font-mono text-xs">
                  {Number(rate.sell_rate).toFixed(4)}
                </div>
                <div className="col-span-2 text-center">
                  {rate.hasOverride ? (
                    <Badge
                      variant="secondary"
                      className="text-[10px] bg-amber-100 text-amber-700"
                    >
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {rate.overrideCount}
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="text-[10px] bg-green-100 text-green-700"
                    >
                      Global
                    </Badge>
                  )}
                </div>
                <div className="col-span-3 flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 cursor-pointer"
                    onClick={() => onEditSettings?.(rate.currency_code)}
                    title="Edit Currency Settings"
                  >
                    <TrendingUp className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 cursor-pointer"
                    onClick={() => onEditRate?.(rate.currency_code)}
                    title="Edit Branch Rate"
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 cursor-pointer"
                    onClick={() => onViewHistory?.(rate.currency_code)}
                    title="View Rate History"
                  >
                    <History className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-zinc-200">
          <Button
            variant="outline"
            size="sm"
            className="w-full cursor-pointer rounded-none"
            onClick={() => onEditRate?.("")}
          >
            <Edit className="w-4 h-4 mr-2" />
            Manage All Rates
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
