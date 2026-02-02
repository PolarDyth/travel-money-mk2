"use client"

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  AlertTriangle,
  Calendar,
  MapPin,
  ExternalLink,
  CheckCircle,
  ArrowUp,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { ComplianceAlertWithDetails } from "@/lib/queries/compliance"

const SEVERITY_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  critical: { label: "Critical", color: "text-red-700", bg: "bg-red-100 border-red-200" },
  high: { label: "High", color: "text-orange-700", bg: "bg-orange-100 border-orange-200" },
  medium: { label: "Medium", color: "text-amber-700", bg: "bg-amber-100 border-amber-200" },
  low: { label: "Low", color: "text-blue-700", bg: "bg-blue-100 border-blue-200" },
}

type AlertDetailDialogProps = {
  alert: ComplianceAlertWithDetails
  onClose: () => void
  onAcknowledge: () => void
  onResolve: () => void
  onEscalate: () => void
  onViewTransaction: (transactionId: string) => void
  isProcessing: boolean
}

export function AlertDetailDialog({
  alert,
  onClose,
  onAcknowledge,
  onResolve,
  onEscalate,
  onViewTransaction,
  isProcessing,
}: AlertDetailDialogProps) {
  const config = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.low
  const isPending = !alert.acknowledged_at && !alert.resolved_at
  const isAcknowledged = alert.acknowledged_at && !alert.resolved_at
  const isResolved = !!alert.resolved_at

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl rounded-none">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className={cn("w-6 h-6", config.color)} />
              <div>
                <DialogTitle className="text-lg font-bold">
                  {alert.alert_type}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={cn("text-[10px] capitalize", config.bg)}>
                    {config.label}
                  </Badge>
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
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="cursor-pointer">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-4">
            {/* Description */}
            <div>
              <h4 className="text-sm font-semibold text-zinc-700 mb-2">Description</h4>
              <p className="text-sm text-zinc-600">{alert.description}</p>
            </div>

            <Separator />

            {/* Timeline */}
            <div>
              <h4 className="text-sm font-semibold text-zinc-700 mb-3">Timeline</h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-zinc-400 mt-1.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-zinc-700">Alert Created</p>
                    <p className="text-xs text-zinc-500">{formatDate(alert.created_at)}</p>
                  </div>
                </div>

                {alert.acknowledged_at && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-zinc-700">Acknowledged</p>
                      <p className="text-xs text-zinc-500">{formatDate(alert.acknowledged_at)}</p>
                      {alert.acknowledged_by_staff && (
                        <p className="text-xs text-zinc-500">
                          by {alert.acknowledged_by_staff.first_name} {alert.acknowledged_by_staff.last_name}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {alert.resolved_at && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-zinc-700">Resolved</p>
                      <p className="text-xs text-zinc-500">{formatDate(alert.resolved_at)}</p>
                      {alert.resolved_by_staff && (
                        <p className="text-xs text-zinc-500">
                          by {alert.resolved_by_staff.first_name} {alert.resolved_by_staff.last_name}
                        </p>
                      )}
                      {alert.resolution_notes && (
                        <p className="text-xs text-zinc-600 mt-1 italic">&quot;{alert.resolution_notes}&quot;</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Details */}
            <div>
              <h4 className="text-sm font-semibold text-zinc-700 mb-3">Details</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-zinc-500" />
                  <span className="text-zinc-600">Branch:</span>
                  <span className="font-medium text-zinc-700">
                    {alert.branch?.name ?? "Unknown"} ({alert.branch?.code})
                  </span>
                </div>

                {alert.transaction && (
                  <div className="flex items-center gap-2 text-sm">
                    <ExternalLink className="w-4 h-4 text-zinc-500" />
                    <span className="text-zinc-600">Transaction:</span>
                    <button
                      onClick={() => onViewTransaction(alert.transaction!.id!)}
                      className="font-medium text-blue-600 hover:underline cursor-pointer"
                    >
                      {alert.transaction.reference_number}
                    </button>
                  </div>
                )}

                {alert.transaction && (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-zinc-500" />
                      <span className="text-zinc-600">TXN Date:</span>
                      <span className="font-medium text-zinc-700">
                        {new Date(alert.transaction.created_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-zinc-600">Amount:</span>
                      <span className="font-medium text-zinc-700">
                        £{alert.transaction.base_amount.toFixed(2)}
                      </span>
                      <span className="text-zinc-500">
                        {alert.transaction.foreign_currency_code}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex gap-2">
          {isPending && (
            <>
              <Button
                variant="outline"
                onClick={onAcknowledge}
                disabled={isProcessing}
                className="cursor-pointer rounded-none"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Acknowledge
              </Button>
              <Button
                variant="outline"
                onClick={onEscalate}
                disabled={isProcessing}
                className="cursor-pointer rounded-none"
              >
                <ArrowUp className="w-4 h-4 mr-2" />
                Escalate
              </Button>
              <Button
                onClick={onResolve}
                disabled={isProcessing}
                className="cursor-pointer rounded-none"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Resolve
              </Button>
            </>
          )}
          {isAcknowledged && (
            <>
              <Button
                variant="outline"
                onClick={onEscalate}
                disabled={isProcessing}
                className="cursor-pointer rounded-none"
              >
                <ArrowUp className="w-4 h-4 mr-2" />
                Escalate
              </Button>
              <Button
                onClick={onResolve}
                disabled={isProcessing}
                className="cursor-pointer rounded-none"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Resolve
              </Button>
            </>
          )}
          <Button variant="ghost" onClick={onClose} className="cursor-pointer">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
