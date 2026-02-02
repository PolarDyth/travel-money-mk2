"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  Trash2,
  Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { SuspiciousPattern } from "@/types"

type PatternManagementPanelProps = {
  patterns: SuspiciousPattern[]
  isLoading: boolean
  onToggle: (patternId: string, isActive: boolean) => void
  onDelete: (patternId: string) => void
  onRefresh: () => void
}

const PATTERN_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  structuring: { label: "Structuring", color: "text-red-700", bg: "bg-red-100 border-red-200" },
  velocity: { label: "Velocity", color: "text-orange-700", bg: "bg-orange-100 border-orange-200" },
  back_to_back: { label: "Back-to-Back", color: "text-amber-700", bg: "bg-amber-100 border-amber-200" },
  group: { label: "Group", color: "text-blue-700", bg: "bg-blue-100 border-blue-200" },
  unusual: { label: "Unusual", color: "text-purple-700", bg: "bg-purple-100 border-purple-200" },
}

const SEVERITY_CONFIG: Record<string, { label: string; bg: string }> = {
  HIGH: { label: "High", bg: "bg-red-100 text-red-700" },
  MEDIUM: { label: "Medium", bg: "bg-amber-100 text-amber-700" },
  LOW: { label: "Low", bg: "bg-blue-100 text-blue-700" },
}

export function PatternManagementPanel({
  patterns,
  isLoading,
  onToggle,
  onDelete,
  onRefresh,
}: PatternManagementPanelProps) {
  return (
    <Card className="rounded-none border-zinc-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-600 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Suspicious Pattern Detection Rules
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onRefresh} className="cursor-pointer rounded-none">
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : patterns.length === 0 ? (
          <div className="py-12 text-center">
            <Settings className="w-12 h-12 mx-auto mb-3 text-zinc-400" />
            <p className="text-sm font-medium text-zinc-700">No patterns configured</p>
            <p className="text-xs text-zinc-500">Add suspicious pattern detection rules</p>
          </div>
        ) : (
          <div className="space-y-3">
            {patterns.map((pattern) => {
              const typeConfig = PATTERN_TYPE_CONFIG[pattern.pattern_type] || {
                label: pattern.pattern_type,
                color: "text-zinc-700",
                bg: "bg-zinc-100 border-zinc-200",
              }
              const severityConfig = SEVERITY_CONFIG[pattern.severity] || SEVERITY_CONFIG.MEDIUM

              return (
                <div
                  key={pattern.id}
                  className={cn(
                    "p-4 border bg-zinc-50 transition-opacity",
                    !pattern.is_active && "opacity-60"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className={cn("text-[10px] capitalize", typeConfig.bg)}>
                          {typeConfig.label}
                        </Badge>
                        <Badge variant="secondary" className={cn("text-[10px]", severityConfig.bg)}>
                          {severityConfig.label} Severity
                        </Badge>
                        {pattern.branch_id ? (
                          <Badge variant="secondary" className="text-[10px] bg-zinc-100 text-zinc-700">
                            Branch-specific
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-700">
                            Global
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium text-black mb-1">{pattern.name}</p>
                      <p className="text-xs text-zinc-600 mb-2">{pattern.description}</p>

                      {/* Thresholds display */}
                      {pattern.thresholds && (
                        <div className="text-xs text-zinc-500 bg-white p-2 border border-zinc-200 rounded">
                          <p className="font-semibold mb-1">Detection Thresholds:</p>
                          <pre className="text-[10px] overflow-x-auto">
                            {JSON.stringify(pattern.thresholds, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={pattern.is_active}
                        onCheckedChange={() => onToggle(pattern.id, pattern.is_active)}
                        className="cursor-pointer"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs cursor-pointer"
                        onClick={() => onDelete(pattern.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
