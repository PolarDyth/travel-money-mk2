"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertTriangle,
  Shield,
  ExternalLink,
  RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { HighRiskCustomer } from "@/types"

type HighRiskCustomersTableProps = {
  customers: HighRiskCustomer[]
  isLoading: boolean
  onRefresh: () => void
}

const RISK_LEVEL_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  CRITICAL: { label: "Critical", color: "text-red-700", bg: "bg-red-100 border-red-200" },
  HIGH: { label: "High", color: "text-orange-700", bg: "bg-orange-100 border-orange-200" },
  MEDIUM: { label: "Medium", color: "text-amber-700", bg: "bg-amber-100 border-amber-200" },
  LOW: { label: "Low", color: "text-blue-700", bg: "bg-blue-100 border-blue-200" },
}

export function HighRiskCustomersTable({
  customers,
  isLoading,
  onRefresh,
}: HighRiskCustomersTableProps) {
  return (
    <Card className="rounded-none border-zinc-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-600 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            High-Risk Customers (Score &ge; 75)
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onRefresh} className="cursor-pointer rounded-none">
            <RefreshCw className="w-3 h-3 mr-1" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="py-12 text-center">
            <Shield className="w-12 h-12 mx-auto mb-3 text-zinc-400" />
            <p className="text-sm font-medium text-zinc-700">No high-risk customers</p>
            <p className="text-xs text-zinc-500">No customers with risk score &ge; 75</p>
          </div>
        ) : (
          <div className="space-y-2">
            {customers.map((customer) => {
              const riskConfig = RISK_LEVEL_CONFIG[customer.risk_level || "MEDIUM"] || RISK_LEVEL_CONFIG.MEDIUM

              return (
                <div
                  key={customer.id}
                  className={cn(
                    "p-4 border-l-4 bg-zinc-50 flex items-center justify-between gap-4",
                    customer.risk_level === "CRITICAL" && "border-l-red-500",
                    customer.risk_level === "HIGH" && "border-l-orange-500",
                    customer.risk_level === "MEDIUM" && "border-l-amber-500",
                    customer.risk_level === "LOW" && "border-l-blue-500"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {customer.is_on_watchlist && (
                        <Badge variant="secondary" className="text-[10px] bg-red-100 text-red-700">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Watchlist
                        </Badge>
                      )}
                      <Badge variant="outline" className={cn("text-[10px] capitalize", riskConfig.bg)}>
                        {riskConfig.label}
                      </Badge>
                      <span className="text-[10px] text-zinc-500">
                        Risk Score: {customer.risk_score}/100
                      </span>
                    </div>

                    <p className="text-sm font-medium text-black">
                      {customer.first_name} {customer.last_name}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-zinc-500 mt-1">
                      <span>Branch: {customer.branch_name}</span>
                      <span>Phone: {customer.phone || "N/A"}</span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs cursor-pointer"
                    onClick={() => window.open(`/admin/customers/${customer.id}`, "_blank")}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Investigate
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
