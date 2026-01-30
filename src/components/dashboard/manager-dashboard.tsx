"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { BranchComparison } from "./widgets/manager/branch-comparison";
import { ReconciliationQueue } from "./widgets/manager/reconciliation-queue";
import { TrendCharts } from "./widgets/manager/trend-charts";
import { RateManagement } from "./widgets/manager/rate-management";
import { StaffPerformance } from "./widgets/manager/staff-performance";
import { CurrencySettingsDialog } from "./widgets/manager/currency-settings-dialog";
import { BranchRateEditDialog } from "./widgets/manager/branch-rate-edit-dialog";
import { useUser } from "@/lib/hooks/use-user";
import { getBranchRateSettings, type BranchRateSetting } from "@/lib/queries/manager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

type CurrencySettings = {
  is_enabled: boolean;
  allow_rate_override: boolean;
  max_override_percentage: number | null;
  require_supervisor_approval: boolean;
};

export function ManagerDashboard() {
  const router = useRouter();
  const { user } = useUser();
  const [rateEditOpen, setRateEditOpen] = useState(false);
  const [currencySettingsOpen, setCurrencySettingsOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<BranchRateSetting | null>(null);
  const [selectedSettings, setSelectedSettings] = useState<CurrencySettings | undefined>(undefined);
  const [branchRates, setBranchRates] = useState<BranchRateSetting[]>([]);

  const branchId = user?.branch_id;

  // Fetch branch rate settings
  useCallback(async () => {
    if (branchId) {
      const rates = await getBranchRateSettings(branchId);
      setBranchRates(rates);
    }
  }, [branchId]);

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
      const currencyData = branchRates.find(r => r.currencyCode === currencyId);
      setSelectedCurrency(currencyData || null);
      setRateEditOpen(true);
    },
    [branchRates]
  );

  const handleEditCurrencySettings = useCallback(
    (currencyId: string) => {
      const currencyData = branchRates.find(r => r.currencyCode === currencyId);
      setSelectedCurrency(currencyData || null);
      // Fetch full settings would be done here
      setSelectedSettings({
        is_enabled: true,
        allow_rate_override: false,
        max_override_percentage: null,
        require_supervisor_approval: true,
      });
      setCurrencySettingsOpen(true);
    },
    [branchRates]
  );

  const handleRateSaved = useCallback(() => {
    setRateEditOpen(false);
    // Refetch branch rates
    if (branchId) {
      getBranchRateSettings(branchId).then(setBranchRates);
    }
  }, [branchId]);

  const handleSettingsSaved = useCallback(() => {
    setCurrencySettingsOpen(false);
    setSelectedCurrency(null);
    setSelectedSettings(undefined);
    // Refresh data as needed
  }, []);

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
              onEditSettings={handleEditCurrencySettings}
            />
          </div>
        </div>

        {/* Staff Performance Table - Full Width */}
        <StaffPerformance />

        {/* Currency Settings Summary Card */}
        {branchRates.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Currency Settings Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {branchRates.slice(0, 6).map((rate) => (
                  <div
                    key={rate.currencyCode}
                    className="rounded-lg border p-4 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleEditCurrencySettings(rate.currencyCode)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">{rate.currencyCode}</span>
                      {rate.hasOverride && (
                        <span className="text-xs text-amber-600">
                          Custom Rate
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {rate.hasOverride ? (
                        <span>
                          Branch Buy: {rate.branchBuyRate?.toFixed(4) ?? "N/A"}
                        </span>
                      ) : (
                        <span>Using Global Rates</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Dialogs */}
      {selectedCurrency && branchId && (
        <>
          <BranchRateEditDialog
            open={rateEditOpen}
            onOpenChange={setRateEditOpen}
            branchId={branchId}
            currencyCode={selectedCurrency.currencyCode}
            currencyName={selectedCurrency.currencyName}
            globalBuyRate={selectedCurrency.globalBuyRate}
            globalSellRate={selectedCurrency.globalSellRate}
            currentBuyRate={selectedCurrency.branchBuyRate}
            currentSellRate={selectedCurrency.branchSellRate}
            hasOverride={selectedCurrency.hasOverride}
            onSave={handleRateSaved}
          />
          <CurrencySettingsDialog
            open={currencySettingsOpen}
            onOpenChange={setCurrencySettingsOpen}
            branchId={branchId}
            currencyCode={selectedCurrency.currencyCode}
            currencyName={selectedCurrency.currencyName}
            currentSettings={selectedSettings}
            onSave={handleSettingsSaved}
          />
        </>
      )}
    </div>
  );
}
