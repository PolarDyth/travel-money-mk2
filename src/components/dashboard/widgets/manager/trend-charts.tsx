"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { getTrendData, getCurrencyVolumes, type TrendDataPoint, type CurrencyVolume } from "@/lib/queries/manager";

type TrendChartsProps = {
  className?: string;
};

type Period = "7" | "14" | "30";

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `£${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `£${(value / 1000).toFixed(0)}K`;
  }
  return `£${value.toFixed(0)}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function TrendCharts({ className }: TrendChartsProps) {
  const [period, setPeriod] = useState<Period>("7");
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [currencyData, setCurrencyData] = useState<CurrencyVolume[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const [trends, currencies] = await Promise.all([
        getTrendData(parseInt(period)),
        getCurrencyVolumes(),
      ]);
      setTrendData(trends);
      setCurrencyData(currencies);
      setIsLoading(false);
    }

    fetchData();
  }, [period]);

  if (isLoading) {
    return (
      <Card className={`rounded-none border-zinc-200 ${className}`}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`rounded-none border-zinc-200 ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-600 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Trends
          </CardTitle>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList className="h-7">
              <TabsTrigger value="7" className="text-xs h-6 px-2">
                7D
              </TabsTrigger>
              <TabsTrigger value="14" className="text-xs h-6 px-2">
                14D
              </TabsTrigger>
              <TabsTrigger value="30" className="text-xs h-6 px-2">
                30D
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Volume Trend Line Chart */}
        <div>
          <h4 className="text-xs font-semibold text-zinc-600 uppercase mb-3">
            Volume Over Time
          </h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fontSize: 10 }}
                  stroke="#71717a"
                />
                <YAxis
                  tickFormatter={formatCurrency}
                  tick={{ fontSize: 10 }}
                  stroke="#71717a"
                  width={60}
                />
                <Tooltip
                  formatter={(value: number | undefined) =>
                    formatCurrency(value ?? 0)
                  }
                  labelFormatter={(label) => formatDate(label as string)}
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e4e4e7",
                    borderRadius: 0,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line
                  type="monotone"
                  dataKey="buyVolume"
                  name="Buy"
                  stroke="#C5A065"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="sellVolume"
                  name="Sell"
                  stroke="#000"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Currency Volume Bar Chart */}
        <div>
          <h4 className="text-xs font-semibold text-zinc-600 uppercase mb-3">
            Volume by Currency (Today)
          </h4>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={currencyData.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis
                  type="number"
                  tickFormatter={(v) => formatCurrency(v)}
                  tick={{ fontSize: 10 }}
                  stroke="#71717a"
                />
                <YAxis
                  type="category"
                  dataKey="currencyCode"
                  tick={{ fontSize: 10 }}
                  stroke="#71717a"
                  width={40}
                />
                <Tooltip
                  formatter={(value: number | undefined) =>
                    formatCurrency(value ?? 0)
                  }
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e4e4e7",
                    borderRadius: 0,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="volume" name="Volume" fill="#C5A065" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Commission Trend */}
        <div>
          <h4 className="text-xs font-semibold text-zinc-600 uppercase mb-3">
            Commission Revenue
          </h4>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fontSize: 10 }}
                  stroke="#71717a"
                />
                <YAxis
                  tickFormatter={formatCurrency}
                  tick={{ fontSize: 10 }}
                  stroke="#71717a"
                  width={60}
                />
                <Tooltip
                  formatter={(value: number | undefined) =>
                    formatCurrency(value ?? 0)
                  }
                  labelFormatter={(label) => formatDate(label as string)}
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e4e4e7",
                    borderRadius: 0,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Commission"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="#22c55e"
                  fillOpacity={0.1}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
