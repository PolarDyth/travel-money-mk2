"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Shield, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getAlertsByCategory, type AlertsByCategory } from "@/lib/queries/admin";

type ComplianceOverviewProps = {
  className?: string;
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#3b82f6",
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
}

export function ComplianceOverview({ className }: ComplianceOverviewProps) {
  const [data, setData] = useState<AlertsByCategory | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const result = await getAlertsByCategory();
      setData(result);
      setIsLoading(false);
    }

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <Card className={cn("rounded-none border-zinc-200", className)}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const severityData = Object.entries(data.severity).map(([name, value]) => ({
    name,
    value,
    color: SEVERITY_COLORS[name] ?? "#71717a",
  }));

  const typeData = Object.entries(data.type)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({ name, value }));

  const totalAlerts = Object.values(data.severity).reduce((a, b) => a + b, 0);

  return (
    <Card className={cn("rounded-none border-zinc-200", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-600 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Compliance Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-zinc-50 border border-zinc-200">
            <p className="text-xs text-zinc-500 font-semibold uppercase mb-1">
              Total Alerts
            </p>
            <p className="text-2xl font-bold">{totalAlerts}</p>
          </div>
          <div className="p-3 bg-zinc-50 border border-zinc-200">
            <div className="flex items-center gap-1 text-xs text-zinc-500 font-semibold uppercase mb-1">
              <Clock className="w-3 h-3" />
              Avg Resolution
            </div>
            <p className="text-2xl font-bold">
              {formatDuration(data.avgResolutionTimeMinutes)}
            </p>
          </div>
        </div>

        {/* Severity Breakdown */}
        <div>
          <h4 className="text-xs font-semibold text-zinc-600 uppercase mb-3">
            By Severity
          </h4>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={20}
                    outerRadius={40}
                    strokeWidth={0}
                  >
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1">
              {severityData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="capitalize">{item.name}</span>
                  </div>
                  <Badge
                    variant="secondary"
                    className="text-[10px]"
                    style={{
                      backgroundColor: `${item.color}20`,
                      color: item.color,
                    }}
                  >
                    {item.value}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Alert Types */}
        {typeData.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-zinc-600 uppercase mb-3">
              By Alert Type
            </h4>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeData} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} stroke="#71717a" />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    stroke="#71717a"
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e4e4e7",
                      borderRadius: 0,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="value" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Alerts by Branch */}
        {data.byBranch.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-zinc-600 uppercase mb-3">
              By Branch (Unresolved)
            </h4>
            <div className="space-y-1">
              {data.byBranch.slice(0, 5).map((item) => (
                <div
                  key={item.branchName}
                  className="flex items-center justify-between py-1 border-b border-zinc-100"
                >
                  <span className="text-sm">{item.branchName}</span>
                  <Badge variant="secondary" className="text-[10px] bg-zinc-100">
                    {item.count}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
