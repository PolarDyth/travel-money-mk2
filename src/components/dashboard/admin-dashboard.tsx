"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { SystemHealth } from "./widgets/admin/system-health";
import { AuditTrail } from "./widgets/admin/audit-trail";
import { ComplianceOverview } from "./widgets/admin/compliance-overview";
import { StaffDirectory } from "./widgets/admin/staff-directory";
import { CurrencyManagement } from "./widgets/admin/currency-management";
import { DenominationManagement } from "./widgets/admin/denomination-management";
import { RateOverrideAudit } from "./widgets/admin/rate-override-audit";
import { getSystemHealth, type SystemHealthStats } from "@/lib/queries/admin";
import { Monitor, AlertTriangle, RefreshCw, Database, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/lib/hooks/use-user";

export function AdminDashboard() {
  const [stats, setStats] = useState<SystemHealthStats | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "currencies" | "audit">("overview");
  const { user, isLoading: isUserLoading } = useUser();

  useEffect(() => {
    if (isUserLoading || !user) return;

    async function fetchStats() {
      const data = await getSystemHealth();
      setStats(data);
    }

    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [isUserLoading, user?.id, user]);

  const formatLastSync = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
      <div className="space-y-6">
        {/* Status Bar */}
        <div className="bg-black text-white p-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <StatusItem
              icon={<Monitor className="w-4 h-4" />}
              label="Active Tills"
              value={stats?.activeTills ?? "-"}
            />
            <div className="h-4 w-px bg-zinc-700" />
            <StatusItem
              icon={<AlertTriangle className="w-4 h-4" />}
              label="Pending Alerts"
              value={stats?.pendingAlerts ?? "-"}
              warning={(stats?.pendingAlerts ?? 0) > 0}
            />
            <div className="h-4 w-px bg-zinc-700" />
            <StatusItem
              icon={<RefreshCw className="w-4 h-4" />}
              label="Last Sync"
              value={formatLastSync(stats?.lastRateSyncAt ?? null)}
            />
          </div>
          <Badge
            variant="secondary"
            className={cn(
              "text-xs",
              (stats?.errorCount24h ?? 0) === 0
                ? "bg-green-900 text-green-300"
                : "bg-red-900 text-red-300"
            )}
          >
            {(stats?.errorCount24h ?? 0) === 0
              ? "All Systems Operational"
              : `${stats?.errorCount24h} Errors (24h)`}
          </Badge>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-black">Admin Dashboard</h1>
          <p className="text-sm text-zinc-500">
            System monitoring and administration
          </p>
          {user && user.role !== "admin" && (
            <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 inline-block">
              You are signed in as {user.role}. Admin stats are limited by RLS.
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b pb-1">
          <button
            onClick={() => setActiveTab("overview")}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              activeTab === "overview"
                ? "text-black border-b-2 border-black"
                : "text-muted-foreground hover:text-black"
            )}
          >
            <Monitor className="h-4 w-4 mr-2 inline" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab("currencies")}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              activeTab === "currencies"
                ? "text-black border-b-2 border-black"
                : "text-muted-foreground hover:text-black"
            )}
          >
            <Database className="h-4 w-4 mr-2 inline" />
            Currencies
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              activeTab === "audit"
                ? "text-black border-b-2 border-black"
                : "text-muted-foreground hover:text-black"
            )}
          >
            <History className="h-4 w-4 mr-2 inline" />
            Audit Trail
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-12 gap-6">
            {/* Left Column: System Health + Audit Trail */}
            <div className="col-span-12 lg:col-span-6 space-y-6">
              <SystemHealth />
              <AuditTrail />
            </div>

            {/* Right Column: Compliance + Staff */}
            <div className="col-span-12 lg:col-span-6 space-y-6">
              <ComplianceOverview />
              <StaffDirectory />
            </div>
          </div>
        )}

        {activeTab === "currencies" && (
          <div className="grid grid-cols-12 gap-6">
            {/* Left Column: Currency Management */}
            <div className="col-span-12 lg:col-span-8">
              <CurrencyManagement />
            </div>

            {/* Right Column: Denomination Management */}
            <div className="col-span-12 lg:col-span-4">
              <DenominationManagement />
            </div>
          </div>
        )}

        {activeTab === "audit" && (
          <div className="grid grid-cols-1">
            <RateOverrideAudit />
          </div>
        )}
      </div>
  );
}

function StatusItem({
  icon,
  label,
  value,
  warning = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  warning?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={warning ? "text-amber-400" : "text-[#C5A065]"}>
        {icon}
      </span>
      <div>
        <p className="text-[10px] text-zinc-400 uppercase">{label}</p>
        <p
          className={cn(
            "text-sm font-semibold",
            warning ? "text-amber-400" : "text-white"
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
