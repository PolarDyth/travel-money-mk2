"use client";

import { useEffect, useState, useCallback } from "react";
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
import { Input } from "@/components/ui/input";
import {
  ScrollText,
  ChevronDown,
  ChevronUp,
  Search,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getAuditTrail, type AuditLogEntry } from "@/lib/queries/admin";

type AuditTrailProps = {
  className?: string;
};

type AuditLogDetails = {
  notes?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  [key: string]: unknown;
};

const ACTION_COLORS: Record<string, string> = {
  created: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  voided: "bg-red-100 text-red-700",
  refunded: "bg-amber-100 text-amber-700",
  updated: "bg-purple-100 text-purple-700",
  default: "bg-zinc-100 text-zinc-700",
};

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AuditTrail({ className }: AuditTrailProps) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    let isActive = true;

    async function loadData() {
      setIsLoading(true);
      const filters =
        actionFilter !== "all" ? { actionType: actionFilter } : undefined;
      const result = await getAuditTrail(pageSize, page * pageSize, filters);

      if (isActive) {
        setEntries(result.entries);
        setTotal(result.total);
        setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isActive = false;
    };
  }, [actionFilter, page, refreshKey]);

  const handleFilterChange = (value: string) => {
    setActionFilter(value);
    setPage(0);
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const totalPages = Math.ceil(total / pageSize);

  if (isLoading && entries.length === 0) {
    return (
      <Card className={cn("rounded-none border-zinc-200", className)}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-28" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("rounded-none border-zinc-200", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-600 flex items-center gap-2">
            <ScrollText className="w-4 h-4" />
            Audit Trail
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={actionFilter} onValueChange={handleFilterChange}>
              <SelectTrigger className="h-7 w-28 rounded-none text-xs">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="created">Created</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="voided">Voided</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 cursor-pointer"
              onClick={() => setRefreshKey((prev) => prev + 1)}
            >
              <RefreshCw
                className={cn("w-4 h-4", isLoading && "animate-spin")}
              />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="py-8 text-center text-zinc-500">
            <ScrollText className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
            <p className="text-sm">No audit entries found</p>
          </div>
        ) : (
          <>
            <div className="space-y-1 max-h-[400px] overflow-y-auto">
              {entries.map((entry) => {
                const isExpanded = expandedIds.has(entry.id);
                const actionColor =
                  ACTION_COLORS[entry.action] ?? ACTION_COLORS.default;
                const details = (entry.details as AuditLogDetails) || {};

                return (
                  <div
                    key={entry.id}
                    className="border border-zinc-200 hover:bg-zinc-50 transition-colors"
                  >
                    <button
                      className="w-full p-3 text-left cursor-pointer"
                      onClick={() => toggleExpanded(entry.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge
                            variant="secondary"
                            className={cn("text-[10px] uppercase", actionColor)}
                          >
                            {entry.action}
                          </Badge>
                          <div>
                            <p className="text-sm font-medium">
                              {entry.performer?.first_name ?? "Unknown"}{" "}
                              {entry.performer?.last_name ?? ""}
                            </p>
                            <p className="text-xs text-zinc-500 font-mono">
                              TXN: {entry.transaction_id.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-500">
                            {formatDateTime(entry.performed_at)}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-zinc-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-zinc-400" />
                          )}
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-3 pb-3 pt-0 border-t border-zinc-100 bg-zinc-50">
                        <div className="grid grid-cols-2 gap-4 text-xs pt-3">
                          <div>
                            <p className="text-zinc-500 font-semibold uppercase">
                              Transaction ID
                            </p>
                            <p className="font-mono">{entry.transaction_id}</p>
                          </div>
                          <div>
                            <p className="text-zinc-500 font-semibold uppercase">
                              Performed By
                            </p>
                            <p>
                              {entry.performer?.first_name}{" "}
                              {entry.performer?.last_name}
                              {entry.performer?.employee_number &&
                                ` (${entry.performer.employee_number})`}
                            </p>
                          </div>
                          {details.notes && (
                            <div className="col-span-2">
                              <p className="text-zinc-500 font-semibold uppercase">
                                Notes
                              </p>
                              <p>{details.notes}</p>
                            </div>
                          )}
                          {details.old_values && (
                            <div>
                              <p className="text-zinc-500 font-semibold uppercase">
                                Previous Values
                              </p>
                              <pre className="text-xs bg-zinc-100 p-2 overflow-x-auto">
                                {JSON.stringify(details.old_values, null, 2)}
                              </pre>
                            </div>
                          )}
                          {details.new_values && (
                            <div>
                              <p className="text-zinc-500 font-semibold uppercase">
                                New Values
                              </p>
                              <pre className="text-xs bg-zinc-100 p-2 overflow-x-auto">
                                {JSON.stringify(details.new_values, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-200">
                <p className="text-xs text-zinc-500">
                  Showing {page * pageSize + 1}-
                  {Math.min((page + 1) * pageSize, total)} of {total}
                </p>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 cursor-pointer rounded-none"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 cursor-pointer rounded-none"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
