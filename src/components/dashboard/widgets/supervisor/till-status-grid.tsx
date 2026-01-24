"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Monitor, Clock, User, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getTillStatus, type TillWithOperator } from "@/lib/queries/supervisor";
import type { DrawerSessionStatus } from "@/types";

type TillStatusGridProps = {
  branchId: string;
  onViewTill?: (sessionId: string) => void;
  onSuspendTill?: (sessionId: string) => void;
  onForceClose?: (sessionId: string) => void;
};

const STATUS_CONFIG: Record<
  DrawerSessionStatus,
  { label: string; color: string; dotColor: string }
> = {
  open: {
    label: "Open",
    color: "bg-green-100 text-green-700",
    dotColor: "bg-green-500",
  },
  closed: {
    label: "Closed",
    color: "bg-zinc-100 text-zinc-700",
    dotColor: "bg-zinc-400",
  },
  suspended: {
    label: "Suspended",
    color: "bg-amber-100 text-amber-700",
    dotColor: "bg-amber-500",
  },
};

function formatDuration(startDate: string): string {
  const start = new Date(startDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function TillStatusGrid({
  branchId,
  onViewTill,
  onSuspendTill,
  onForceClose,
}: TillStatusGridProps) {
  const [tills, setTills] = useState<TillWithOperator[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTills() {
      setIsLoading(true);
      const data = await getTillStatus(branchId);
      setTills(data);
      setIsLoading(false);
    }

    fetchTills();

    // Refresh every 30 seconds
    const interval = setInterval(fetchTills, 30000);
    return () => clearInterval(interval);
  }, [branchId]);

  if (isLoading) {
    return (
      <Card className="rounded-none border-zinc-200">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const openTills = tills.filter((t) => t.status === "open");
  const otherTills = tills.filter((t) => t.status !== "open");

  return (
    <Card className="rounded-none border-zinc-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-600 flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            Till Status
          </CardTitle>
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            {openTills.length} Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {tills.length === 0 ? (
          <div className="py-8 text-center text-zinc-500">
            <Monitor className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
            <p className="text-sm">No drawer sessions today</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {/* Show open tills first */}
            {openTills.map((till) => (
              <TillCard
                key={till.id}
                till={till}
                onView={onViewTill}
                onSuspend={onSuspendTill}
                onForceClose={onForceClose}
              />
            ))}
            {/* Then closed/suspended */}
            {otherTills.slice(0, 4 - openTills.length).map((till) => (
              <TillCard
                key={till.id}
                till={till}
                onView={onViewTill}
                onSuspend={onSuspendTill}
                onForceClose={onForceClose}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TillCard({
  till,
  onView,
  onSuspend,
  onForceClose,
}: {
  till: TillWithOperator;
  onView?: (id: string) => void;
  onSuspend?: (id: string) => void;
  onForceClose?: (id: string) => void;
}) {
  const config = STATUS_CONFIG[till.status];
  const operatorName = till.operator
    ? `${till.operator.first_name} ${till.operator.last_name?.charAt(0)}.`
    : "Unknown";

  return (
    <div
      className={cn(
        "border p-3 relative group transition-colors",
        till.status === "open" && "border-green-200 bg-green-50/50",
        till.status === "closed" && "border-zinc-200 bg-zinc-50",
        till.status === "suspended" && "border-amber-200 bg-amber-50/50"
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", config.dotColor)} />
          <span className="font-medium text-sm">
            Till {till.till_number ?? "?"}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => onView?.(till.id)}
              className="cursor-pointer"
            >
              View Details
            </DropdownMenuItem>
            {till.status === "open" && (
              <>
                <DropdownMenuItem
                  onClick={() => onSuspend?.(till.id)}
                  className="cursor-pointer"
                >
                  Suspend Till
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onForceClose?.(till.id)}
                  className="cursor-pointer text-red-600 focus:text-red-600"
                >
                  Force Close
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-1 text-xs text-zinc-600">
          <User className="w-3 h-3" />
          {operatorName}
        </div>
        {till.status === "open" && (
          <div className="flex items-center gap-1 text-xs text-zinc-500">
            <Clock className="w-3 h-3" />
            {formatDuration(till.opened_at)}
          </div>
        )}
      </div>

      <Badge
        variant="secondary"
        className={cn("absolute bottom-2 right-2 text-[10px]", config.color)}
      >
        {config.label}
      </Badge>
    </div>
  );
}
