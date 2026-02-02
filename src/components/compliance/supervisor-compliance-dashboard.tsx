"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  CheckCircle,
  Filter,
  Eye,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  getComplianceAlerts,
  getAlertStats,
  type ComplianceAlertWithDetails,
} from "@/lib/queries/compliance"
import { acknowledgeComplianceAlert, resolveComplianceAlert, escalateComplianceAlert } from "@/app/(dashboard)/supervisor/compliance/actions"
import { AlertDetailDialog } from "./alert-detail-dialog"
import { ResolveAlertDialog } from "./resolve-alert-dialog"

type SupervisorComplianceDashboardProps = {
  branchId: string
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

const STATUS_FILTERS = ["all", "pending", "acknowledged", "resolved"] as const
const SEVERITY_FILTERS = ["all", "critical", "high", "medium", "low"] as const

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

function calculateResolutionTime(created: string, resolved: string | null): string {
  if (!resolved) return "-"
  const diffMs = new Date(resolved).getTime() - new Date(created).getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))

  if (diffMins < 60) return `${diffMins}m`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m`
  return `${Math.floor(diffHours / 24)}d ${diffHours % 24}h`
}

export function SupervisorComplianceDashboard({
  branchId,
}: SupervisorComplianceDashboardProps) {
  const router = useRouter()
  const [alerts, setAlerts] = useState<ComplianceAlertWithDetails[]>([])
  const [stats, setStats] = useState({
    total: 0,
    unresolved: 0,
    acknowledged: 0,
    resolved: 0,
    bySeverity: {} as Record<string, number>,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<typeof STATUS_FILTERS[number]>("pending")
  const [severityFilter, setSeverityFilter] = useState<typeof SEVERITY_FILTERS[number]>("all")
  const [processing, setProcessing] = useState<string | null>(null)
  const [selectedAlert, setSelectedAlert] = useState<ComplianceAlertWithDetails | null>(null)
  const [showResolveDialog, setShowResolveDialog] = useState(false)
  const [alertToResolve, setAlertToResolve] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    const [alertsResult, statsResult] = await Promise.all([
      getComplianceAlerts({
        branchId,
        status: statusFilter === "all" ? undefined : statusFilter,
        severity: severityFilter === "all" ? undefined : severityFilter,
      }),
      getAlertStats(30),
    ])
    setAlerts(alertsResult.alerts)
    setStats({
      total: statsResult.total,
      unresolved: statsResult.unresolved,
      acknowledged: statsResult.acknowledged,
      resolved: statsResult.resolved,
      bySeverity: statsResult.bySeverity,
    })
    setIsLoading(false)
  }, [branchId, statusFilter, severityFilter])

  useEffect(() => {
    const timeout = setTimeout(fetchData, 0)
    return () => clearTimeout(timeout)
  }, [fetchData, branchId, statusFilter, severityFilter])

  const handleViewAlert = (alert: ComplianceAlertWithDetails) => {
    setSelectedAlert(alert)
  }

  const handleAcknowledge = async (alertId: string) => {
    setProcessing(alertId)
    const result = await acknowledgeComplianceAlert({ alertId })
    setProcessing(null)

    if (result.success) {
      toast.success("Alert acknowledged")
      await fetchData()
    } else {
      toast.error(result.error?.userMessage ?? "Failed to acknowledge alert")
    }
  }

  const handleResolve = (alertId: string) => {
    setAlertToResolve(alertId)
    setShowResolveDialog(true)
  }

  const handleResolveSubmit = async (resolutionNotes: string) => {
    if (!alertToResolve) return

    setProcessing(alertToResolve)
    const result = await resolveComplianceAlert({ alertId: alertToResolve, resolutionNotes })
    setProcessing(null)
    setShowResolveDialog(false)
    setAlertToResolve(null)

    if (result.success) {
      toast.success("Alert resolved")
      await fetchData()
    } else {
      toast.error(result.error?.userMessage ?? "Failed to resolve alert")
    }
  }

  const handleEscalate = async (alertId: string) => {
    setProcessing(alertId)
    const result = await escalateComplianceAlert({
      alertId,
      resolutionNotes: "Escalated to manager for review",
    })
    setProcessing(null)

    if (result.success) {
      toast.success("Alert escalated to manager")
      await fetchData()
    } else {
      toast.error(result.error?.userMessage ?? "Failed to escalate alert")
    }
  }

  const handleViewTransaction = (transactionId: string) => {
    router.push(`/operator/transaction?txn=${transactionId}`)
  }

  const filteredAlerts = alerts.sort((a, b) => {
    // Sort by priority (severity) then by date
    const aSeverity = SEVERITY_CONFIG[a.severity]?.priority ?? 5
    const bSeverity = SEVERITY_CONFIG[b.severity]?.priority ?? 5
    if (aSeverity !== bSeverity) {
      return aSeverity - bSeverity
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black">Compliance</h1>
          <p className="text-sm text-zinc-500">Monitor and manage compliance alerts</p>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Total Alerts"
          value={stats.total}
          color="text-zinc-700"
          bg="bg-zinc-50"
        />
        <StatCard
          label="Pending"
          value={stats.unresolved}
          color="text-amber-700"
          bg="bg-amber-50"
        />
        <StatCard
          label="Acknowledged"
          value={stats.acknowledged}
          color="text-blue-700"
          bg="bg-blue-50"
        />
        <StatCard
          label="Resolved"
          value={stats.resolved}
          color="text-green-700"
          bg="bg-green-50"
        />
      </div>

      {/* Filters */}
      <Card className="rounded-none border-zinc-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Filter className="w-4 h-4 text-zinc-500" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-zinc-700">Status:</span>
              {STATUS_FILTERS.map((filter) => (
                <Button
                  key={filter}
                  variant={statusFilter === filter ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(filter)}
                  className="h-7 text-xs capitalize cursor-pointer rounded-none"
                >
                  {filter}
                </Button>
              ))}
            </div>
            <div className="w-px h-6 bg-zinc-200" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-zinc-700">Severity:</span>
              {SEVERITY_FILTERS.map((filter) => (
                <Button
                  key={filter}
                  variant={severityFilter === filter ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSeverityFilter(filter)}
                  className="h-7 text-xs capitalize cursor-pointer rounded-none"
                >
                  {filter}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <Card className="rounded-none border-zinc-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-600">
            Alerts ({filteredAlerts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p className="text-sm font-medium text-green-700">All caught up</p>
              <p className="text-xs text-zinc-500">No alerts matching the current filters</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAlerts.map((alert) => {
                const config = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.low
                const isPending = !alert.acknowledged_at && !alert.resolved_at
                const isAcknowledged = alert.acknowledged_at && !alert.resolved_at
                const isResolved = !!alert.resolved_at

                return (
                  <div
                    key={alert.id}
                    className={cn(
                      "p-4 border-l-4 bg-zinc-50 transition-opacity",
                      config.bg.split(" ")[0].replace("-100", "-50"),
                      processing === alert.id && "opacity-50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] capitalize", config.bg)}
                          >
                            {config.label}
                          </Badge>
                          <span className="text-[10px] text-zinc-500">
                            {formatTime(alert.created_at)}
                          </span>
                          {isAcknowledged && (
                            <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-700">
                              Acknowledged
                            </Badge>
                          )}
                          {isResolved && (
                            <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700">
                              Resolved
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-black mb-1">
                          {alert.alert_type}
                        </p>
                        <p className="text-xs text-zinc-600 mb-2 line-clamp-2">
                          {alert.description}
                        </p>
                        {alert.resolved_at && (
                          <p className="text-[10px] text-zinc-500">
                            Resolved in {calculateResolutionTime(alert.created_at, alert.resolved_at)}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs cursor-pointer"
                          onClick={() => handleViewAlert(alert)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                        {isPending && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs cursor-pointer rounded-none"
                              onClick={() => handleAcknowledge(alert.id)}
                              disabled={processing === alert.id}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Ack
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs cursor-pointer rounded-none"
                              onClick={() => handleResolve(alert.id)}
                              disabled={processing === alert.id}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Resolve
                            </Button>
                          </>
                        )}
                        {isAcknowledged && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs cursor-pointer rounded-none"
                            onClick={() => handleResolve(alert.id)}
                            disabled={processing === alert.id}
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert Detail Dialog */}
      {selectedAlert && (
        <AlertDetailDialog
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onAcknowledge={() => {
            handleAcknowledge(selectedAlert.id)
            setSelectedAlert(null)
          }}
          onResolve={() => {
            handleResolve(selectedAlert.id)
            setSelectedAlert(null)
          }}
          onEscalate={() => {
            handleEscalate(selectedAlert.id)
            setSelectedAlert(null)
          }}
          onViewTransaction={handleViewTransaction}
          isProcessing={processing === selectedAlert.id}
        />
      )}

      {/* Resolve Dialog */}
      {showResolveDialog && alertToResolve && (
        <ResolveAlertDialog
          onClose={() => {
            setShowResolveDialog(false)
            setAlertToResolve(null)
          }}
          onSubmit={handleResolveSubmit}
          isProcessing={processing === alertToResolve}
        />
      )}
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
