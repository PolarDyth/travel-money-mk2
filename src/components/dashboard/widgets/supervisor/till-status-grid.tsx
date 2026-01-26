"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Monitor, Clock, User, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getTillStatus, type TillWithOperator } from "@/lib/queries/supervisor";
import {
  forceCloseDrawerSession,
  suspendDrawerSession,
} from "@/app/(dashboard)/supervisor/actions";
import type { DrawerSessionStatus } from "@/types";

type TillStatusGridProps = {
  branchId: string;
  onViewTill?: (sessionId: string) => void;
  onSuspendTill?: (sessionId: string, reason: string) => void;
  onForceClose?: (sessionId: string, reason: string) => void;
};

type TillActionType = "suspend" | "forceClose";

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
  const initialLoadRef = useRef(true);
  const [actionOpen, setActionOpen] = useState(false);
  const [actionType, setActionType] = useState<TillActionType | null>(null);
  const [selectedTill, setSelectedTill] = useState<TillWithOperator | null>(null);
  const [reason, setReason] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTills() {
      if (initialLoadRef.current) {
        setIsLoading(true);
      }
      const data = await getTillStatus(branchId);
      setTills(data);
      if (initialLoadRef.current) {
        setIsLoading(false);
        initialLoadRef.current = false;
      }
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

  const handleRequestAction = (type: TillActionType, till: TillWithOperator) => {
    setActionType(type);
    setSelectedTill(till);
    setReason("");
    setAcknowledged(false);
    setActionError(null);
    setActionOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedTill || !actionType) return;
    const trimmedReason = reason.trim();
    if (!trimmedReason || !acknowledged) return;

    setIsSubmitting(true);
    setActionError(null);

    const payload = {
      session_id: selectedTill.id,
      reason: trimmedReason,
    };

    if (actionType === "suspend") {
      const result = await suspendDrawerSession(payload);
      if (result?.error) {
        toast.error("Unable to suspend till", { description: result.error });
        setActionError(result.error);
        setIsSubmitting(false);
        return;
      }

      setTills((prev) =>
        prev.map((till) =>
          till.id === selectedTill.id
            ? { ...till, status: "suspended", closing_notes: trimmedReason }
            : till
        )
      );

      onSuspendTill?.(selectedTill.id, trimmedReason);
      toast.success("Till suspended", {
        description: "The till is now suspended and transactions are paused.",
      });
    } else {
      const result = await forceCloseDrawerSession(payload);
      if (result?.error) {
        toast.error("Unable to force close till", { description: result.error });
        setActionError(result.error);
        setIsSubmitting(false);
        return;
      }

      setTills((prev) =>
        prev.map((till) =>
          till.id === selectedTill.id
            ? {
                ...till,
                status: "closed",
                closed_at: new Date().toISOString(),
                closing_notes: trimmedReason,
              }
            : till
        )
      );

      onForceClose?.(selectedTill.id, trimmedReason);
      toast.success("Till force closed", {
        description: "The till session has been closed and requires reconciliation.",
      });
    }

    setIsSubmitting(false);
    setActionOpen(false);
  };

  const actionTitle =
    actionType === "suspend"
      ? "Suspend Till"
      : actionType === "forceClose"
        ? "Force Close Till"
        : "Till Action";
  const actionSummary =
    actionType === "suspend"
      ? "Suspending a till pauses transactions until the session is resumed."
      : actionType === "forceClose"
        ? "Force closing immediately ends the session and requires reconciliation."
        : "This action changes the status of a till.";
  const acknowledgementText =
    actionType === "suspend"
      ? "I understand this will pause all transactions for this till."
      : actionType === "forceClose"
        ? "I understand this will immediately close the till and may require corrective action."
        : "I understand the impact of this action.";

  return (
    <>
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
                  onSuspend={(item) => handleRequestAction("suspend", item)}
                  onForceClose={(item) => handleRequestAction("forceClose", item)}
                />
              ))}
              {/* Then closed/suspended */}
              {otherTills.slice(0, 4 - openTills.length).map((till) => (
                <TillCard
                  key={till.id}
                  till={till}
                  onView={onViewTill}
                  onSuspend={(item) => handleRequestAction("suspend", item)}
                  onForceClose={(item) => handleRequestAction("forceClose", item)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={actionOpen}
        onOpenChange={(open) => {
          setActionOpen(open);
          if (!open) {
            setActionType(null);
            setSelectedTill(null);
            setReason("");
            setAcknowledged(false);
            setIsSubmitting(false);
            setActionError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionTitle}</DialogTitle>
            <DialogDescription>{actionSummary}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {actionError && (
              <Alert variant="destructive">
                <AlertTitle>Action failed</AlertTitle>
                <AlertDescription>{actionError}</AlertDescription>
              </Alert>
            )}
            {selectedTill && (
              <div className="rounded-none border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                Till {selectedTill.till_number ?? "?"} · {selectedTill.operator?.first_name ?? "Unknown"}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="till-reason" className="text-sm">
                Reason (required)
              </Label>
              <textarea
                id="till-reason"
                rows={4}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Provide a clear operational reason."
                className="w-full rounded-none border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <label className="flex items-start gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
                className="mt-1 h-4 w-4 border-zinc-300"
              />
              <span>{acknowledgementText}</span>
            </label>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-none"
              onClick={() => setActionOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-none"
              variant={actionType === "forceClose" ? "destructive" : "default"}
              disabled={!reason.trim() || !acknowledged || isSubmitting}
              onClick={handleConfirmAction}
            >
              {isSubmitting
                ? "Processing..."
                : `Confirm ${actionType === "forceClose" ? "Force Close" : "Suspend"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
  onSuspend?: (till: TillWithOperator) => void;
  onForceClose?: (till: TillWithOperator) => void;
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
                  onClick={() => onSuspend?.(till)}
                  className="cursor-pointer"
                >
                  Suspend Till
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onForceClose?.(till)}
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
