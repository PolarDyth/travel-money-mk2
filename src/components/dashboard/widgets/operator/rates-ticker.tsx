"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCurrentRates, type RateWithCurrency } from "@/lib/queries/operator";

// Currency flags mapping
const CURRENCY_FLAGS: Record<string, string> = {
  EUR: "🇪🇺",
  USD: "🇺🇸",
  AUD: "🇦🇺",
  CAD: "🇨🇦",
  JPY: "🇯🇵",
  CHF: "🇨🇭",
  NZD: "🇳🇿",
  HKD: "🇭🇰",
  SGD: "🇸🇬",
  SEK: "🇸🇪",
  NOK: "🇳🇴",
  DKK: "🇩🇰",
  ZAR: "🇿🇦",
  AED: "🇦🇪",
  THB: "🇹🇭",
  MXN: "🇲🇽",
  TRY: "🇹🇷",
  PLN: "🇵🇱",
  CZK: "🇨🇿",
  INR: "🇮🇳",
};

type RatesTickerProps = {
  branchId?: string;
  refreshInterval?: number; // in milliseconds
};

type RateChange = "up" | "down" | "neutral";

type RateWithChange = RateWithCurrency & {
  buyChange: RateChange;
  sellChange: RateChange;
};

export function RatesTicker({
  branchId,
  refreshInterval = 10000,
}: RatesTickerProps) {
  const [rates, setRates] = useState<RateWithChange[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const previousRatesRef = useRef<Map<string, RateWithCurrency>>(new Map());

  useEffect(() => {
    async function fetchRates() {
      const result = await getCurrentRates(branchId);

      if (!result.data) {
        setIsLoading(false);
        return;
      }

      const newRates = result.data;

    // Compare with previous rates to determine changes
    const ratesWithChanges: RateWithChange[] = newRates.map((rate) => {
      const prevRate = previousRatesRef.current.get(rate.currency_code);
      let buyChange: RateChange = "neutral";
      let sellChange: RateChange = "neutral";

      if (prevRate) {
        const prevBuy = Number(prevRate.buy_rate);
        const newBuy = Number(rate.buy_rate);
        const prevSell = Number(prevRate.sell_rate);
        const newSell = Number(rate.sell_rate);

        if (newBuy > prevBuy) buyChange = "up";
        else if (newBuy < prevBuy) buyChange = "down";

        if (newSell > prevSell) sellChange = "up";
        else if (newSell < prevSell) sellChange = "down";
      }

      return { ...rate, buyChange, sellChange };
    });

    // Store current rates as previous for next comparison
    const newPrevRates = new Map<string, RateWithCurrency>();
    newRates.forEach((rate) => newPrevRates.set(rate.currency_code, rate));
    previousRatesRef.current = newPrevRates;

      const prev = previousRatesRef.current;
      const didChange = newRates.some((rate) => {
        const prevRate = prev.get(rate.currency_code);
        return (
          !prevRate ||
          Number(prevRate.buy_rate) !== Number(rate.buy_rate) ||
          Number(prevRate.sell_rate) !== Number(rate.sell_rate)
        );
      });

      if (didChange || isLoading) {
        setRates(ratesWithChanges);
        setLastUpdate(new Date());
        setIsLoading(false);
      }
    }

    fetchRates();

    const interval = setInterval(fetchRates, refreshInterval);
    return () => clearInterval(interval);
  }, [branchId, refreshInterval, isLoading]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getChangeIcon = (change: RateChange) => {
    switch (change) {
      case "up":
        return <TrendingUp className="w-3 h-3 text-green-500" />;
      case "down":
        return <TrendingDown className="w-3 h-3 text-red-500" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  // Take first 6 rates for display
  const displayRates = rates.slice(0, 6);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-black flex items-center gap-2 uppercase tracking-wide">
          <TrendingUp className="w-5 h-5 text-[#C5A065]" />
          Live Rates
        </h3>
        <span className="text-xs text-zinc-500 bg-zinc-100 px-2 py-1 border border-zinc-200 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          {lastUpdate ? `Updated ${formatTime(lastUpdate)}` : "Loading..."}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {displayRates.map((rate) => (
          <Card
            key={rate.id}
            className={cn(
              "border-zinc-200 shadow-sm hover:border-black transition-colors cursor-default rounded-none",
              (rate.buyChange !== "neutral" || rate.sellChange !== "neutral") &&
                "ring-1 ring-[#C5A065] ring-opacity-50"
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">
                  {CURRENCY_FLAGS[rate.currency?.code ?? ""] ?? "💱"}
                </span>
                <div>
                  <div className="font-bold text-black">
                    {rate.currency?.code ?? "???"}
                  </div>
                  <div className="text-xs text-zinc-500 truncate">
                    {rate.currency?.name ?? "Unknown"}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-zinc-50 p-2 border border-zinc-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400 uppercase font-semibold tracking-wider">
                      We Buy
                    </span>
                    {getChangeIcon(rate.buyChange)}
                  </div>
                  <div
                    className={cn(
                      "font-mono font-medium",
                      rate.buyChange === "up" && "text-green-600",
                      rate.buyChange === "down" && "text-red-600",
                      rate.buyChange === "neutral" && "text-zinc-700"
                    )}
                  >
                    {Number(rate.buy_rate).toFixed(4)}
                  </div>
                </div>
                <div className="bg-black p-2 border border-black">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#C5A065] uppercase font-semibold tracking-wider">
                      We Sell
                    </span>
                    {rate.sellChange !== "neutral" && (
                      <span
                        className={cn(
                          rate.sellChange === "up"
                            ? "text-green-400"
                            : "text-red-400"
                        )}
                      >
                        {rate.sellChange === "up" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                  <div
                    className={cn(
                      "font-mono font-bold",
                      rate.sellChange === "up" && "text-green-400",
                      rate.sellChange === "down" && "text-red-400",
                      rate.sellChange === "neutral" && "text-white"
                    )}
                  >
                    {Number(rate.sell_rate).toFixed(4)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
