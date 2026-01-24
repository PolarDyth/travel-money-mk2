"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TillStatusGrid } from "./widgets/supervisor/till-status-grid";
import { BranchSummary } from "./widgets/supervisor/branch-summary";
import { OperatorMetrics } from "./widgets/supervisor/operator-metrics";
import { PendingAlerts } from "./widgets/supervisor/pending-alerts";
import { useUser } from "@/lib/hooks/use-user";
import {
  Settings,
  FileText,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";

export function SupervisorDashboard() {
  const router = useRouter();
  const { user } = useUser();

  // Quick action handlers
  const handleOverrideRate = useCallback(() => {
    router.push("/rates/override");
  }, [router]);

  const handleReviewFlagged = useCallback(() => {
    router.push("/transactions/flagged");
  }, [router]);

  const handleForceCloseTill = useCallback(() => {
    router.push("/drawer/force-close");
  }, [router]);

  const handleViewReconciliation = useCallback(() => {
    router.push("/reconciliation");
  }, [router]);

  const handleViewTransaction = useCallback(
    (transactionId: string) => {
      router.push(`/transactions/${transactionId}`);
    },
    [router]
  );

  const handleViewTill = useCallback(
    (sessionId: string) => {
      router.push(`/drawer/session/${sessionId}`);
    },
    [router]
  );

  return (
      <div className="space-y-6">
        {/* Header with Quick Actions */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-black">Branch Overview</h1>
            <p className="text-sm text-zinc-500">
              {user?.branch?.name ?? "Loading..."} Supervisor Dashboard
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewReconciliation}
              className="cursor-pointer rounded-none"
            >
              <FileText className="w-4 h-4 mr-2" />
              Reconciliation
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOverrideRate}
              className="cursor-pointer rounded-none"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Override Rate
            </Button>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column: Till Status + Operator Metrics */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            {user?.branch_id && (
              <>
                <TillStatusGrid
                  branchId={user.branch_id}
                  onViewTill={handleViewTill}
                  onForceClose={handleForceCloseTill}
                />
                <OperatorMetrics branchId={user.branch_id} />
              </>
            )}
          </div>

          {/* Center Column: Branch Summary */}
          <div className="col-span-12 lg:col-span-5">
            {user?.branch_id && <BranchSummary branchId={user.branch_id} />}
          </div>

          {/* Right Column: Pending Alerts */}
          <div className="col-span-12 lg:col-span-3">
            {user?.branch_id && user?.id && (
              <PendingAlerts
                branchId={user.branch_id}
                userId={user.id}
                onViewTransaction={handleViewTransaction}
              />
            )}
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickActionButton
            icon={<TrendingUp className="w-5 h-5" />}
            label="Override Branch Rate"
            description="Temporarily adjust rates"
            onClick={handleOverrideRate}
          />
          <QuickActionButton
            icon={<AlertTriangle className="w-5 h-5" />}
            label="Review Flagged"
            description="Transactions needing attention"
            onClick={handleReviewFlagged}
          />
          <QuickActionButton
            icon={<Settings className="w-5 h-5" />}
            label="Force-Close Till"
            description="Emergency till closure"
            onClick={handleForceCloseTill}
            variant="warning"
          />
          <QuickActionButton
            icon={<FileText className="w-5 h-5" />}
            label="Daily Reconciliation"
            description="View end-of-day summary"
            onClick={handleViewReconciliation}
          />
        </div>
      </div>
  );
}

function QuickActionButton({
  icon,
  label,
  description,
  onClick,
  variant = "default",
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  variant?: "default" | "warning";
}) {
  return (
    <button
      onClick={onClick}
      className={`
        p-4 border text-left transition-colors cursor-pointer
        ${
          variant === "warning"
            ? "border-amber-200 bg-amber-50 hover:bg-amber-100"
            : "border-zinc-200 bg-white hover:bg-zinc-50"
        }
      `}
    >
      <div
        className={`
          mb-2
          ${variant === "warning" ? "text-amber-600" : "text-zinc-600"}
        `}
      >
        {icon}
      </div>
      <p className="font-semibold text-sm text-black">{label}</p>
      <p className="text-xs text-zinc-500">{description}</p>
    </button>
  );
}
