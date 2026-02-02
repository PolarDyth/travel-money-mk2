"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Shield,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { HighRiskCustomer, SuspiciousPattern } from "@/types"
import {
  getComplianceAlerts,
  getAlertStats,
  getHighRiskCustomers,
  getSuspiciousPatterns,
  getRecentComplianceActivity,
  type ComplianceAlertWithDetails,
} from "@/lib/queries/compliance"
import {
  updateSuspiciousPattern,
  deleteSuspiciousPattern,
} from "@/app/(dashboard)/admin/compliance/actions"
import { PatternManagementPanel } from "./pattern-management-panel"
import { HighRiskCustomersTable } from "./high-risk-customers-table"

type AdminComplianceDashboardProps = {
  adminId: string
}

const SEVERITY_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; priority: number }
> = {
  critical: { label: "Critical", color: "text-red-700", bg: "bg-red-100 border-red-200", priority: 1 },
  high: { label: "High", color: "text-orange-700", bg: "bg-orange-100 border-orange-200", priority: 2 },
  medium: { label: "Medium", color: "text-amber-700", bg: "bg-amber-100 border-amber-200", priority: 3 },
  low: { label: "Low", color: "text-blue-700", bg: "bg-blue-100 border-blue-200", priority: 4 },
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))

  if (diffMins < 60) {
    return `${diffMins}m ago`
  }

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) {
    return `${diffHours}h ago`
  }

  return date.toLocaleDateString("en-GB", { month: "short", day: "numeric" })
}

export function AdminComplianceDashboard({ adminId: _adminId }: AdminComplianceDashboardProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")

  // Overview tab state
  const [stats, setStats] = useState({
    total: 0,
    unresolved: 0,
    bySeverity: {} as Record<string, number>,
  })
  const [recentActivity, setRecentActivity] = useState<
    Array<{
      type: "alert_created" | "alert_acknowledged" | "alert_resolved" | "risk_updated"
      timestamp: string
      description: string
      severity?: string
      branch?: string
    }>
  >([])
  const [isLoadingOverview, setIsLoadingOverview] = useState(true)

  // Alerts tab state
  const [alerts, setAlerts] = useState<ComplianceAlertWithDetails[]>([])
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(true)

  // High risk customers tab state
  const [highRiskCustomers, setHighRiskCustomers] = useState<HighRiskCustomer[]>([])
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true)

  // Patterns tab state
  const [patterns, setPatterns] = useState<SuspiciousPattern[]>([])
  const [isLoadingPatterns, setIsLoadingPatterns] = useState(true)

  const fetchOverview = useCallback(async () => {
    setIsLoadingOverview(true)
    const [statsResult, activityResult] = await Promise.all([
      getAlertStats(30),
      getRecentComplianceActivity(10),
    ])
    setStats({
      total: statsResult.total,
      unresolved: statsResult.unresolved,
      bySeverity: statsResult.bySeverity,
    })
    setRecentActivity(activityResult)
    setIsLoadingOverview(false)
  }, [])

  const fetchAlerts = useCallback(async () => {
    setIsLoadingAlerts(true)
    const result = await getComplianceAlerts({ status: "all", limit: 100 })
    setAlerts(result.alerts)
    setIsLoadingAlerts(false)
  }, [])

  const fetchHighRiskCustomers = useCallback(async () => {
    setIsLoadingCustomers(true)
    const result = await getHighRiskCustomers(75)
    setHighRiskCustomers(result)
    setIsLoadingCustomers(false)
  }, [])

  const fetchPatterns = useCallback(async () => {
    setIsLoadingPatterns(true)
    const result = await getSuspiciousPatterns()
    setPatterns(result)
    setIsLoadingPatterns(false)
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchOverview()
      fetchAlerts()
      fetchHighRiskCustomers()
      fetchPatterns()
    }, 0)
    return () => clearTimeout(timeout)
  }, [fetchOverview, fetchAlerts, fetchHighRiskCustomers, fetchPatterns])

  const handleTogglePattern = async (patternId: string, isActive: boolean) => {
    const result = await updateSuspiciousPattern({
      patternId,
      isActive: !isActive,
    })

    if (result.success) {
      toast.success(`Pattern ${isActive ? "disabled" : "enabled"}`)
      await fetchPatterns()
    } else {
      toast.error(result.error?.userMessage ?? "Failed to update pattern")
    }
  }

  const handleDeletePattern = async (patternId: string) => {
    if (!confirm("Are you sure you want to delete this pattern?")) return

    const result = await deleteSuspiciousPattern(patternId)

    if (result.success) {
      toast.success("Pattern deleted")
      await fetchPatterns()
    } else {
      toast.error(result.error?.userMessage ?? "Failed to delete pattern")
    }
  }

  const criticalCount = stats.bySeverity.critical ?? 0
  const highCount = stats.bySeverity.high ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black">Compliance Management</h1>
          <p className="text-sm text-zinc-500">System-wide compliance oversight and configuration</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="cursor-pointer rounded-none"
          >
            Back
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl rounded-none">
          <TabsTrigger value="overview" className="cursor-pointer">
            Overview
          </TabsTrigger>
          <TabsTrigger value="alerts" className="cursor-pointer">
            Alerts ({stats.unresolved})
          </TabsTrigger>
          <TabsTrigger value="customers" className="cursor-pointer">
            High-Risk Customers
          </TabsTrigger>
          <TabsTrigger value="patterns" className="cursor-pointer">
            Patterns
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard
              label="Total Alerts (30d)"
              value={stats.total}
              color="text-zinc-700"
              bg="bg-zinc-50"
            />
            <StatCard
              label="Unresolved"
              value={stats.unresolved}
              color="text-amber-700"
              bg="bg-amber-50"
            />
            <StatCard
              label="Critical/High"
              value={criticalCount + highCount}
              color="text-red-700"
              bg="bg-red-50"
            />
            <StatCard
              label="High-Risk Customers"
              value={highRiskCustomers.length}
              color="text-orange-700"
              bg="bg-orange-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Severity Breakdown */}
            <Card className="rounded-none border-zinc-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-600">
                  Alerts by Severity (30 days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingOverview ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-8" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(stats.bySeverity).length === 0 ? (
                      <p className="text-sm text-zinc-500 text-center py-4">No alerts</p>
                    ) : (
                      Object.entries(stats.bySeverity)
                        .sort(([a], [b]) => {
                          const order = ["critical", "high", "medium", "low"]
                          return order.indexOf(a) - order.indexOf(b)
                        })
                        .map(([severity, count]) => {
                          const config = SEVERITY_CONFIG[severity]
                          return (
                            <div key={severity} className="flex items-center justify-between py-2 border-b border-zinc-100">
                              <div className="flex items-center gap-2">
                                <div className={cn("w-3 h-3 rounded-sm", config.bg.split(" ")[0].replace("-100", "-500"))} />
                                <span className="text-sm capitalize text-zinc-700">{severity}</span>
                              </div>
                              <Badge variant="secondary" className={cn("text-[10px]", config.bg)}>
                                {count}
                              </Badge>
                            </div>
                          )
                        })
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="rounded-none border-zinc-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-600">
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingOverview ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-10" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentActivity.length === 0 ? (
                      <p className="text-sm text-zinc-500 text-center py-4">No recent activity</p>
                    ) : (
                      recentActivity.slice(0, 8).map((activity, i) => (
                        <div key={i} className="flex items-start gap-3 py-2 border-b border-zinc-100 last:border-0">
                          <div className={cn(
                            "w-2 h-2 rounded-full mt-1.5",
                            activity.type === "alert_created" && "bg-red-400",
                            activity.type === "alert_acknowledged" && "bg-blue-400",
                            activity.type === "alert_resolved" && "bg-green-400",
                            activity.type === "risk_updated" && "bg-amber-400"
                          )} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-zinc-700 truncate">{activity.description}</p>
                            <p className="text-xs text-zinc-500">
                              {activity.branch && `${activity.branch} • `}
                              {formatTime(activity.timestamp)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card className="rounded-none border-zinc-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-600">
                All Compliance Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingAlerts ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : alerts.length === 0 ? (
                <div className="py-12 text-center">
                  <Shield className="w-12 h-12 mx-auto mb-3 text-zinc-400" />
                  <p className="text-sm font-medium text-zinc-700">No alerts</p>
                  <p className="text-xs text-zinc-500">No compliance alerts found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {alerts.slice(0, 20).map((alert) => {
                    const config = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.low
                    return (
                      <div
                        key={alert.id}
                        className={cn(
                          "p-3 border-l-4 bg-zinc-50 flex items-center justify-between gap-4",
                          config.bg.split(" ")[0].replace("-100", "-50")
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={cn("text-[10px] capitalize", config.bg)}>
                              {config.label}
                            </Badge>
                            <span className="text-[10px] text-zinc-500">{formatTime(alert.created_at)}</span>
                            <span className="text-[10px] text-zinc-500">{alert.branch?.name}</span>
                          </div>
                          <p className="text-sm font-medium text-black truncate">{alert.alert_type}</p>
                          <p className="text-xs text-zinc-600 truncate">{alert.description}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs cursor-pointer"
                          onClick={() => router.push(`/supervisor/compliance?alert=${alert.id}`)}
                        >
                          View <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* High-Risk Customers Tab */}
        <TabsContent value="customers">
          <HighRiskCustomersTable
            customers={highRiskCustomers}
            isLoading={isLoadingCustomers}
            onRefresh={fetchHighRiskCustomers}
          />
        </TabsContent>

        {/* Patterns Tab */}
        <TabsContent value="patterns">
          <PatternManagementPanel
            patterns={patterns}
            isLoading={isLoadingPatterns}
            onToggle={handleTogglePattern}
            onDelete={handleDeletePattern}
            onRefresh={fetchPatterns}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
  bg,
}: {
  label: string
  value: number
  color: string
  bg: string
}) {
  return (
    <div className={cn("p-4 border border-zinc-200", bg)}>
      <p className="text-xs font-semibold uppercase text-zinc-600 mb-1">{label}</p>
      <p className={cn("text-2xl font-bold", color)}>{value}</p>
    </div>
  )
}
