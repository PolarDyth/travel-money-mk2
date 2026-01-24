"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRightLeft,
  Banknote,
  Search,
  Wallet,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardShell } from "./shared/dashboard-shell";
import { AlertCard } from "./shared/alert-card";
import { DrawerStatus } from "./widgets/operator/drawer-status";
import { RatesTicker } from "./widgets/operator/rates-ticker";
import { RecentTransactions } from "./widgets/operator/recent-transactions";
import { useUser } from "@/lib/hooks/use-user";
import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";
import { getUnresolvedAlerts } from "@/lib/queries/operator";
import type { ComplianceAlert } from "@/types";

// Mock data for when user is not loaded or for development
const MOCK_DRAWER_BALANCE = 5420.5;

export function OperatorDashboard() {
  const router = useRouter();
  const { user, isLoading, error } = useUser();
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [drawerBalance, setDrawerBalance] = useState(MOCK_DRAWER_BALANCE);

  // Navigation handlers
  const handleSellCurrency = useCallback(() => {
    router.push("/operator/transaction");
  }, [router]);

  const handleBuyCurrency = useCallback(() => {
    router.push("/operator/transaction");
  }, [router]);

  const handleDrawerOps = useCallback(() => {
    router.push("/drawer");
  }, [router]);

  const handleFindTransaction = useCallback(() => {
    router.push("/transactions/search");
  }, [router]);

  const handleViewJournal = useCallback(() => {
    router.push("/journal");
  }, [router]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      { key: "F1", action: handleSellCurrency, description: "Sell Currency" },
      { key: "F2", action: handleBuyCurrency, description: "Buy Currency" },
      { key: "F3", action: handleDrawerOps, description: "Drawer Operations" },
      { key: "F4", action: handleFindTransaction, description: "Find Transaction" },
    ],
    enabled: !isLoading && !!user,
  });

  // Fetch alerts when branch is loaded
  useEffect(() => {
    if (user?.branch_id) {
      getUnresolvedAlerts(user.branch_id).then(setAlerts);
    }
  }, [user?.branch_id]);

  const handleAcknowledgeAlert = useCallback((alertId: string) => {
    // TODO: Implement alert acknowledgement
    console.log("Acknowledge alert:", alertId);
  }, []);

  return (
    <DashboardShell
      user={user}
      isLoading={isLoading}
      error={error}
      drawerBalance={drawerBalance}
      showDrawerBalance={true}
      posPosition="Pos 01"
    >
      <div className="grid grid-rows-[auto_1fr] gap-6">
        {/* Primary Action Area (Top Deck) */}
        <section className="grid grid-cols-12 gap-6 h-[220px]">
          {/* Sell Currency (GBP IN -> Foreign OUT) */}
          <button
            onClick={handleSellCurrency}
            className="col-span-12 md:col-span-5 relative group overflow-hidden bg-black border-2 border-black hover:border-[#C5A065] text-white shadow-sm transition-all flex flex-col items-center justify-center gap-3 cursor-pointer"
          >
            <div className="absolute inset-0 bg-zinc-900 group-hover:bg-black transition-colors" />
            <div className="relative z-10 flex flex-col items-center gap-3">
              <Banknote className="w-12 h-12 mb-1 text-[#C5A065]" />
              <div className="text-center">
                <h2 className="text-3xl font-bold tracking-tight text-white">
                  Sell Currency
                </h2>
                <p className="text-[#C5A065] font-medium mt-1 uppercase text-xs tracking-wider">
                  To Customer
                </p>
              </div>
            </div>
            <div className="absolute top-4 right-4 text-[#C5A065] border border-[#C5A065] px-2 py-1 text-xs font-mono opacity-60">
              F1
            </div>
          </button>

          {/* Buy Currency (Foreign IN -> GBP OUT) */}
          <button
            onClick={handleBuyCurrency}
            className="col-span-12 md:col-span-5 relative group overflow-hidden bg-white border-2 border-black hover:bg-zinc-50 text-black shadow-sm transition-all flex flex-col items-center justify-center gap-3 cursor-pointer"
          >
            <div className="flex flex-col items-center gap-3">
              <ArrowRightLeft className="w-12 h-12 mb-1 text-black" />
              <div className="text-center">
                <h2 className="text-3xl font-bold tracking-tight">
                  Buy Currency
                </h2>
                <p className="text-zinc-600 font-medium mt-1 uppercase text-xs tracking-wider">
                  From Customer
                </p>
              </div>
            </div>
            <div className="absolute top-4 right-4 bg-zinc-100 border border-zinc-300 px-2 py-1 text-xs font-mono opacity-60">
              F2
            </div>
          </button>

          {/* Secondary Actions Stack */}
          <div className="col-span-12 md:col-span-2 flex flex-col gap-4">
            <button
              onClick={handleDrawerOps}
              className="flex-1 bg-white hover:bg-zinc-50 border border-zinc-200 text-black shadow-sm flex flex-col items-center justify-center p-2 transition-colors cursor-pointer group"
            >
              <Wallet className="w-6 h-6 mb-1 text-zinc-400 group-hover:text-[#C5A065] transition-colors" />
              <span className="text-sm font-semibold">Drawer Ops</span>
              <span className="text-[10px] text-zinc-400 mt-1">F3</span>
            </button>
            <button
              onClick={handleFindTransaction}
              className="flex-1 bg-white hover:bg-zinc-50 border border-zinc-200 text-black shadow-sm flex flex-col items-center justify-center p-2 transition-colors cursor-pointer group"
            >
              <Search className="w-6 h-6 mb-1 text-zinc-400 group-hover:text-[#C5A065] transition-colors" />
              <span className="text-sm font-semibold">Find TXN</span>
              <span className="text-[10px] text-zinc-400 mt-1">F4</span>
            </button>
          </div>
        </section>

        {/* Info Deck (Bottom Deck) */}
        <section className="grid grid-cols-12 gap-6">
          {/* Live Rates Ticker */}
          <div className="col-span-12 lg:col-span-8">
            <RatesTicker branchId={user?.branch_id ?? undefined} />
          </div>

          {/* Right Column: Transactions + Drawer Status + Alerts */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
            {/* Drawer Status (if user has branch) */}
            {user?.id && (
              <DrawerStatus
                operatorId={user.id}
                onOpenDrawer={handleDrawerOps}
                onCountDenominations={handleDrawerOps}
              />
            )}

            {/* Recent Transactions */}
            {user?.branch_id && (
              <RecentTransactions
                branchId={user.branch_id}
                operatorId={user.id}
                onViewJournal={handleViewJournal}
              />
            )}

            {/* Compliance Alert Area */}
            {alerts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-zinc-600 uppercase tracking-wider flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  Compliance Notices ({alerts.length})
                </h4>
                {alerts.slice(0, 2).map((alert) => (
                  <AlertCard
                    key={alert.id}
                    id={alert.id}
                    title={alert.alert_type}
                    message={alert.description ?? ""}
                    severity={alert.severity as "critical" | "high" | "medium" | "low"}
                    transactionRef={alert.transaction_id ?? undefined}
                    onAcknowledge={handleAcknowledgeAlert}
                  />
                ))}
              </div>
            )}

            {/* Fallback compliance notice when no alerts */}
            {alerts.length === 0 && (
              <div className="bg-zinc-50 border border-l-4 border-l-amber-500 border-zinc-200 p-3 flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-black">
                    Compliance Notice
                  </p>
                  <p className="text-xs text-zinc-600 mt-1">
                    Review new ID requirements for transactions over £5,000.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
