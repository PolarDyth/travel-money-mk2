"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { BranchComparison } from "./widgets/manager/branch-comparison";
import { ReconciliationQueue } from "./widgets/manager/reconciliation-queue";
import { TrendCharts } from "./widgets/manager/trend-charts";
import { RateManagement } from "./widgets/manager/rate-management";
import { StaffPerformance } from "./widgets/manager/staff-performance";
import { useUser } from "@/lib/hooks/use-user";

export function ManagerDashboard() {
  const router = useRouter();
  const { user } = useUser();

  // Navigation handlers
  const handleSelectBranch = useCallback(
    (branchId: string) => {
      router.push(`/branches/${branchId}`);
    },
    [router]
  );

  const handleInvestigateReconciliation = useCallback(
    (reconciliationId: string) => {
      router.push(`/reconciliation/${reconciliationId}`);
    },
    [router]
  );

  const handleEditRate = useCallback(
    (currencyId: string) => {
      if (currencyId) {
        router.push(`/rates/edit/${currencyId}`);
      } else {
        router.push("/rates");
      }
    },
    [router]
  );

  const handleViewRateHistory = useCallback(
    (currencyId: string) => {
      router.push(`/rates/history/${currencyId}`);
    },
    [router]
  );

  return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-black">Manager Dashboard</h1>
          <p className="text-sm text-zinc-500">
            Multi-branch analytics and rate management
          </p>
        </div>

        {/* Main Grid - Sidebar Layout */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left: Branch Cards + Trend Charts */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            <BranchComparison onSelectBranch={handleSelectBranch} />
            <TrendCharts />
          </div>

          {/* Right: Reconciliation + Rate Management */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            {user?.id && (
              <ReconciliationQueue
                managerId={user.id}
                varianceThreshold={1}
                onInvestigate={handleInvestigateReconciliation}
              />
            )}
            <RateManagement
              onEditRate={handleEditRate}
              onViewHistory={handleViewRateHistory}
            />
          </div>
        </div>

        {/* Staff Performance Table - Full Width */}
        <StaffPerformance />
      </div>
  );
}
