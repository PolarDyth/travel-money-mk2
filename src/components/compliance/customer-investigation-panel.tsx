"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  User,
  Shield,
  AlertTriangle,
  Users,
  FileText,
  Calendar,
  MapPin,
  Phone,
  Mail,
  IdCard,
  RefreshCw,
  ArrowLeft,
  Link2,
  ExternalLink,
  Save,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  getCustomerInvestigation,
  type CustomerInvestigation,
} from "@/lib/queries/compliance"
import { updateCustomerRisk } from "@/app/(dashboard)/admin/compliance/actions"

type CustomerInvestigationPanelProps = {
  customerId: string
}

const RISK_LEVEL_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  CRITICAL: { label: "Critical", color: "text-red-700", bg: "bg-red-100 border-red-200" },
  HIGH: { label: "High", color: "text-orange-700", bg: "bg-orange-100 border-orange-200" },
  MEDIUM: { label: "Medium", color: "text-amber-700", bg: "bg-amber-100 border-amber-200" },
  LOW: { label: "Low", color: "text-blue-700", bg: "bg-blue-100 border-blue-200" },
}

const RISK_FACTOR_TYPE_CONFIG: Record<string, { label: string; bg: string }> = {
  structuring: { label: "Structuring", bg: "bg-red-100 text-red-700" },
  velocity: { label: "Velocity", bg: "bg-orange-100 text-orange-700" },
  high_risk: { label: "High Risk", bg: "bg-red-100 text-red-700" },
  back_to_back: { label: "Back-to-Back", bg: "bg-amber-100 text-amber-700" },
  group_transaction: { label: "Group", bg: "bg-blue-100 text-blue-700" },
  unusual_behavior: { label: "Unusual", bg: "bg-purple-100 text-purple-700" },
  watchlist_match: { label: "Watchlist", bg: "bg-red-100 text-red-700" },
}

const RELATIONSHIP_TYPE_CONFIG: Record<string, { label: string }> = {
  same_id: { label: "Same ID" },
  same_address: { label: "Same Address" },
  same_phone: { label: "Same Phone" },
  linked_transactions: { label: "Linked Transactions" },
  manual_flag: { label: "Manual Flag" },
}

export function CustomerInvestigationPanel({
  customerId,
}: CustomerInvestigationPanelProps) {
  const router = useRouter()
  const [data, setData] = useState<CustomerInvestigation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Risk update form state
  const [riskScore, setRiskScore] = useState(0)
  const [riskLevel, setRiskLevel] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("LOW")
  const [watchlist, setWatchlist] = useState(false)
  const [watchlistReason, setWatchlistReason] = useState("")

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    const result = await getCustomerInvestigation(customerId)
    setData(result)
    if (result) {
      setRiskScore(result.risk_score)
      setRiskLevel(result.risk_level)
      setWatchlist(result.is_on_watchlist ?? false)
      setWatchlistReason(result.watchlist_reason ?? "")
    }
    setIsLoading(false)
  }, [customerId])

  useEffect(() => {
    const timeout = setTimeout(fetchData, 0)
    return () => clearTimeout(timeout)
  }, [fetchData])

  const handleRiskUpdate = async () => {
    setIsSaving(true)
    const result = await updateCustomerRisk({
      customerId,
      riskScore,
      riskLevel,
      watchlist,
      watchlistReason: watchlist ? watchlistReason : undefined,
    })
    setIsSaving(false)

    if (result.success) {
      toast.success("Customer risk updated")
      await fetchData()
    } else {
      toast.error(result.error?.userMessage ?? "Failed to update customer risk")
    }
  }

  const handleViewTransaction = (transactionId: string) => {
    router.push(`/operator/transaction?txn=${transactionId}`)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-8 text-center">
        <User className="w-12 h-12 mx-auto mb-3 text-zinc-400" />
        <p className="text-sm font-medium text-zinc-700">Customer not found</p>
        <Button variant="outline" onClick={() => router.back()} className="mt-4 cursor-pointer rounded-none">
          Go Back
        </Button>
      </div>
    )
  }

  const riskConfig = RISK_LEVEL_CONFIG[data.risk_level] || RISK_LEVEL_CONFIG.MEDIUM

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-black">
              {data.first_name_bytea || 'Customer'} {data.last_name_bytea || ''}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={cn("text-[10px] capitalize", riskConfig.bg)}>
                {riskConfig.label} Risk
              </Badge>
              <span className="text-xs text-zinc-500">Score: {data.risk_score}/100</span>
              {data.is_on_watchlist && (
                <Badge variant="secondary" className="text-[10px] bg-red-100 text-red-700">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Watchlist
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} className="cursor-pointer rounded-none">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl rounded-none">
          <TabsTrigger value="overview" className="cursor-pointer">Overview</TabsTrigger>
          <TabsTrigger value="relationships" className="cursor-pointer">
            Relationships ({data.relationships.length})
          </TabsTrigger>
          <TabsTrigger value="transactions" className="cursor-pointer">
            Transactions ({data.transactions.length})
          </TabsTrigger>
          <TabsTrigger value="alerts" className="cursor-pointer">
            Alerts ({data.alerts.length})
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-3 gap-6">
            {/* Customer Details */}
            <Card className="rounded-none border-zinc-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-600 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Customer Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <DetailRow icon={<IdCard className="w-4 h-4" />} label="ID Number" value={data.id_number_bytea || "[Encrypted]"} />
                <DetailRow icon={<Phone className="w-4 h-4" />} label="Phone" value={data.phone_bytea || "[Encrypted]"} />
                <DetailRow icon={<Mail className="w-4 h-4" />} label="Email" value={data.email_bytea || "[Encrypted]"} />
                <DetailRow icon={<MapPin className="w-4 h-4" />} label="Branch" value={data.branch_name ?? "Unknown"} />
                <DetailRow
                  icon={<Calendar className="w-4 h-4" />}
                  label="First Seen"
                  value={data.first_seen_at ? new Date(data.first_seen_at).toLocaleDateString("en-GB") : "Unknown"}
                />
                <DetailRow
                  icon={<Calendar className="w-4 h-4" />}
                  label="Last Seen"
                  value={data.last_seen_at ? new Date(data.last_seen_at).toLocaleDateString("en-GB") : "Never"}
                />
              </CardContent>
            </Card>

            {/* Risk Factors */}
            <Card className="rounded-none border-zinc-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-600 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Risk Factors ({data.risk_factors.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.risk_factors.length === 0 ? (
                  <p className="text-sm text-zinc-500 text-center py-4">No risk factors</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {data.risk_factors.map((factor) => {
                      const factorConfig = RISK_FACTOR_TYPE_CONFIG[factor.factor_type] || {
                        label: factor.factor_type,
                        bg: "bg-zinc-100 text-zinc-700",
                      }
                      return (
                        <div key={factor.id} className="p-2 border border-zinc-200 bg-zinc-50">
                          <div className="flex items-center justify-between mb-1">
                            <Badge variant="secondary" className={cn("text-[10px]", factorConfig.bg)}>
                              {factorConfig.label}
                            </Badge>
                            <span className="text-[10px] text-zinc-500">
                              {new Date(factor.detected_at).toLocaleDateString("en-GB")}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-600">{factor.description}</p>
                          {factor.expires_at && (
                            <p className="text-[10px] text-zinc-500 mt-1">
                              Expires: {new Date(factor.expires_at).toLocaleDateString("en-GB")}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Risk Management */}
            <Card className="rounded-none border-zinc-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-600 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Risk Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="riskScore">Risk Score (0-100)</Label>
                  <Input
                    id="riskScore"
                    type="number"
                    min={0}
                    max={100}
                    value={riskScore}
                    onChange={(e) => setRiskScore(parseInt(e.target.value) || 0)}
                    className="rounded-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="riskLevel">Risk Level</Label>
                  <select
                    id="riskLevel"
                    value={riskLevel}
                    onChange={(e) => setRiskLevel(e.target.value as typeof riskLevel)}
                    className="w-full h-10 px-3 rounded-none border border-zinc-300 bg-background"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="watchlist"
                      checked={watchlist}
                      onChange={(e) => setWatchlist(e.target.checked)}
                      className="cursor-pointer"
                    />
                    <Label htmlFor="watchlist" className="cursor-pointer">
                      Add to Watchlist
                    </Label>
                  </div>
                </div>

                {watchlist && (
                  <div className="space-y-2">
                    <Label htmlFor="watchlistReason">Watchlist Reason</Label>
                    <Textarea
                      id="watchlistReason"
                      placeholder="Reason for watchlist..."
                      value={watchlistReason}
                      onChange={(e) => setWatchlistReason(e.target.value)}
                      rows={3}
                      className="rounded-none resize-none"
                      maxLength={500}
                    />
                  </div>
                )}

                <Button
                  onClick={handleRiskUpdate}
                  disabled={isSaving}
                  className="w-full cursor-pointer rounded-none"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? "Saving..." : "Update Risk"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Relationships Tab */}
        <TabsContent value="relationships">
          <Card className="rounded-none border-zinc-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-600 flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Linked Customers ({data.relationships.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.relationships.length === 0 ? (
                <div className="py-12 text-center">
                  <Users className="w-12 h-12 mx-auto mb-3 text-zinc-400" />
                  <p className="text-sm font-medium text-zinc-700">No linked customers</p>
                  <p className="text-xs text-zinc-500">This customer has no known relationships</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {data.relationships.map((rel) => {
                    const relType = RELATIONSHIP_TYPE_CONFIG[rel.relationship_type] || {
                      label: rel.relationship_type,
                    }
                    return (
                      <div key={rel.id} className="p-4 border border-zinc-200 bg-zinc-50">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-700">
                            {relType.label}
                          </Badge>
                          <span className="text-[10px] text-zinc-500">
                            Confidence: {rel.confidence_score}%
                          </span>
                        </div>
                        <p className="text-sm font-medium text-black">
                          {rel.related_customer.first_name_bytea || '[Encrypted]'} {rel.related_customer.last_name_bytea || '[Encrypted]'}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {rel.related_customer.branch_name ?? "Unknown Branch"}
                        </p>
                        <p className="text-[10px] text-zinc-500 mt-1">
                          Detected: {new Date(rel.detected_at).toLocaleDateString("en-GB")}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <Card className="rounded-none border-zinc-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-600 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Transaction History ({data.transactions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.transactions.length === 0 ? (
                <div className="py-12 text-center">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-zinc-400" />
                  <p className="text-sm font-medium text-zinc-700">No transactions</p>
                  <p className="text-xs text-zinc-500">This customer has no transaction history</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.transactions.map((txn) => (
                    <div
                      key={txn.id}
                      className="p-3 border border-zinc-200 bg-zinc-50 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-black">{txn.reference_number}</p>
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <span className="capitalize">{txn.transaction_type}</span>
                          <span>•</span>
                          <span>{txn.foreign_currency_code}</span>
                          <span>•</span>
                          <span>£{txn.base_amount.toFixed(2)}</span>
                          <span>•</span>
                          <span>{new Date(txn.created_at).toLocaleDateString("en-GB")}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs cursor-pointer"
                        onClick={() => handleViewTransaction(txn.id)}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <Card className="rounded-none border-zinc-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-600 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Compliance Alerts ({data.alerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.alerts.length === 0 ? (
                <div className="py-12 text-center">
                  <Shield className="w-12 h-12 mx-auto mb-3 text-zinc-400" />
                  <p className="text-sm font-medium text-zinc-700">No alerts</p>
                  <p className="text-xs text-zinc-500">No compliance alerts for this customer</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.alerts.map((alert) => {
                    const alertSeverity = alert.severity.toLowerCase()
                    const severityConfig = RISK_LEVEL_CONFIG[alertSeverity] || RISK_LEVEL_CONFIG.LOW
                    return (
                      <div
                        key={alert.id}
                        className={cn(
                          "p-3 border-l-4 bg-zinc-50",
                          alertSeverity === "critical" && "border-l-red-500",
                          alertSeverity === "high" && "border-l-orange-500",
                          alertSeverity === "medium" && "border-l-amber-500",
                          alertSeverity === "low" && "border-l-blue-500"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="outline" className={cn("text-[10px] capitalize", severityConfig.bg)}>
                            {severityConfig.label}
                          </Badge>
                          <span className="text-[10px] text-zinc-500">
                            {new Date(alert.created_at).toLocaleDateString("en-GB")}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-black">{alert.alert_type}</p>
                        <p className="text-xs text-zinc-600 line-clamp-2">{alert.description}</p>
                        {alert.resolved_at && (
                          <p className="text-[10px] text-green-600 mt-1">
                            Resolved: {new Date(alert.resolved_at).toLocaleDateString("en-GB")}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string | null
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="text-zinc-500 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-zinc-500 uppercase">{label}</p>
        <p className="text-sm text-zinc-700 truncate">{value ?? "Not provided"}</p>
      </div>
    </div>
  )
}

function Settings({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v6m0 6v6" />
      <path d="m4.93 4.93 4.24 4.24m5.66 5.66 4.24 4.24" />
      <path d="M1 12h6m6 0h6" />
      <path d="m4.93 19.07 4.24-4.24m5.66-5.66 4.24-4.24" />
    </svg>
  )
}
