"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Download, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAllStaffPerformance, type StaffPerformance as StaffPerformanceType } from "@/lib/queries/manager";

type StaffPerformanceProps = {
  className?: string;
};

type SortField = "name" | "transactions" | "volume" | "voidRate";
type SortDirection = "asc" | "desc";

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

export function StaffPerformance({ className }: StaffPerformanceProps) {
  const [staff, setStaff] = useState<StaffPerformanceType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("volume");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const data = await getAllStaffPerformance();
      setStaff(data);
      setIsLoading(false);
    }

    fetchData();

    const interval = setInterval(fetchData, 120000);
    return () => clearInterval(interval);
  }, []);

  const branches = useMemo(() => {
    const uniqueBranches = new Map<string, string>();
    staff.forEach((s) => {
      if (s.branchId && s.branchName) {
        uniqueBranches.set(s.branchId, s.branchName);
      }
    });
    return Array.from(uniqueBranches.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  }, [staff]);

  const filteredAndSortedStaff = useMemo(() => {
    let result = [...staff];

    // Filter by branch
    if (branchFilter !== "all") {
      result = result.filter((s) => s.branchId === branchFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = `${a.firstName} ${a.lastName}`.localeCompare(
            `${b.firstName} ${b.lastName}`
          );
          break;
        case "transactions":
          comparison = a.transactionCount - b.transactionCount;
          break;
        case "volume":
          comparison = a.totalVolume - b.totalVolume;
          break;
        case "voidRate":
          comparison = a.voidRate - b.voidRate;
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [staff, branchFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const handleExport = () => {
    const headers = ["Name", "Branch", "Transactions", "Volume", "Avg Value", "Void Rate"];
    const rows = filteredAndSortedStaff.map((s) => [
      `${s.firstName} ${s.lastName}`,
      s.branchName,
      s.transactionCount.toString(),
      s.totalVolume.toFixed(2),
      s.avgTransactionValue.toFixed(2),
      `${s.voidRate.toFixed(2)}%`,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `staff-performance-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Render sort icon inline to avoid component creation during render
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="w-3 h-3" />
    ) : (
      <ChevronDown className="w-3 h-3" />
    );
  };

  if (isLoading) {
    return (
      <Card className={cn("rounded-none border-zinc-200", className)}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("rounded-none border-zinc-200", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-600 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Staff Performance
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="h-8 w-36 rounded-none text-xs">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-8 cursor-pointer rounded-none"
              onClick={handleExport}
            >
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredAndSortedStaff.length === 0 ? (
          <div className="py-8 text-center text-zinc-500">
            <Users className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
            <p className="text-sm">No staff data available</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th
                    className="px-2 py-2 text-left text-[10px] font-semibold text-zinc-500 uppercase cursor-pointer hover:bg-zinc-50"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-1">
                      Name
                      {renderSortIcon("name")}
                    </div>
                  </th>
                  <th className="px-2 py-2 text-left text-[10px] font-semibold text-zinc-500 uppercase">
                    Branch
                  </th>
                  <th
                    className="px-2 py-2 text-right text-[10px] font-semibold text-zinc-500 uppercase cursor-pointer hover:bg-zinc-50"
                    onClick={() => handleSort("transactions")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      TXNs
                      {renderSortIcon("transactions")}
                    </div>
                  </th>
                  <th
                    className="px-2 py-2 text-right text-[10px] font-semibold text-zinc-500 uppercase cursor-pointer hover:bg-zinc-50"
                    onClick={() => handleSort("volume")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Volume
                      {renderSortIcon("volume")}
                    </div>
                  </th>
                  <th className="px-2 py-2 text-right text-[10px] font-semibold text-zinc-500 uppercase">
                    Avg
                  </th>
                  <th
                    className="px-2 py-2 text-right text-[10px] font-semibold text-zinc-500 uppercase cursor-pointer hover:bg-zinc-50"
                    onClick={() => handleSort("voidRate")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Void %
                      {renderSortIcon("voidRate")}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedStaff.map((s) => {
                  const voidStatus = getVoidRateStatus(s.voidRate);
                  return (
                    <tr
                      key={s.id}
                      className="border-b border-zinc-100 hover:bg-zinc-50"
                    >
                      <td className="px-2 py-2 font-medium">
                        {s.firstName} {s.lastName}
                      </td>
                      <td className="px-2 py-2 text-zinc-500 text-xs">
                        {s.branchName}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {s.transactionCount}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        £{formatCurrency(s.totalVolume)}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-zinc-500 text-xs">
                        £{formatCurrency(s.avgTransactionValue)}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px]",
                            voidStatus === "good" &&
                              "bg-green-100 text-green-700",
                            voidStatus === "warning" &&
                              "bg-amber-100 text-amber-700",
                            voidStatus === "error" && "bg-red-100 text-red-700"
                          )}
                        >
                          {s.voidRate.toFixed(1)}%
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
