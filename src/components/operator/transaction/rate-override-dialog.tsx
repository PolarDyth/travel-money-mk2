"use client"

import * as React from "react"
import { AlertTriangle, AlertCircle } from "lucide-react"
import { useState, useEffect, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { canStaffOverrideRate } from "@/app/(dashboard)/operator/transaction/actions"
import type { UserRole } from "@/types"

interface RateOverrideDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  originalRate: number
  currencyCode: string
  branchId: string
  staffRole: UserRole
  onConfirm: (overrideRate: number, reason: string, hasManagerApproval: boolean, acknowledged: boolean) => void
  onCancel: () => void
}

export function RateOverrideDialog({
  open,
  onOpenChange,
  originalRate,
  currencyCode,
  branchId,
  staffRole,
  onConfirm,
  onCancel,
}: RateOverrideDialogProps) {
  const [overrideRate, setOverrideRate] = useState<string>(originalRate.toFixed(6))
  const [reason, setReason] = useState("")
  const [acknowledged, setAcknowledged] = useState(false)
  const [hasManagerApproval, setHasManagerApproval] = useState(false)
  const [requiresManagerApproval] = useState(false)
  const [maxOverridePercentage, setMaxOverridePercentage] = useState<number | undefined>()
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [, startTransition] = useTransition()

  const variance = ((parseFloat(overrideRate) - originalRate) / originalRate) * 100
  const isValidRate = parseFloat(overrideRate) > 0
  const isValidReason = reason.length >= 10 && reason.length <= 500
  const canSubmit =
    isValidRate &&
    isValidReason &&
    acknowledged &&
    (!requiresManagerApproval || hasManagerApproval)

  // Check permissions when dialog opens
  useEffect(() => {
    if (open && branchId && currencyCode && staffRole) {
      startTransition(() => {
        setLoading(true)
        setPermissionError(null)
      })

      canStaffOverrideRate({
        currencyCode,
        branchId,
        staffRole,
      })
        .then((result) => {
          startTransition(() => {
            if (result.success) {
              setMaxOverridePercentage(result.data?.maxOverridePercentage)
            } else {
              setPermissionError(result.error?.userMessage || result.error?.message || "Unable to check permissions")
            }
          })
        })
        .finally(() => {
          startTransition(() => {
            setLoading(false)
          })
        })
    }
  }, [open, branchId, currencyCode, staffRole])

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      startTransition(() => {
        setOverrideRate(originalRate.toFixed(6))
        setReason("")
        setAcknowledged(false)
        setHasManagerApproval(false)
        setPermissionError(null)
      })
    }
  }, [open, originalRate])

  const handleConfirm = () => {
    if (canSubmit) {
      onConfirm(parseFloat(overrideRate), reason, hasManagerApproval, acknowledged)
    }
  }

  const isVarianceTooHigh =
    maxOverridePercentage !== undefined && Math.abs(variance) > maxOverridePercentage

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Rate Override Request
          </DialogTitle>
          <DialogDescription>
            You are requesting to override the standard exchange rate for {currencyCode}. 
            This action will be logged and requires approval.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Checking permissions...</div>
          </div>
        ) : permissionError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{permissionError}</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            {/* Rate Comparison */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Original Rate</Label>
                <div className="text-2xl font-mono font-semibold mt-2">
                  {originalRate.toFixed(6)}
                </div>
              </div>
              <div>
                <Label>Override Rate</Label>
                <Input
                  type="number"
                  step="0.000001"
                  value={overrideRate}
                  onChange={(e) => setOverrideRate(e.target.value)}
                  className="text-2xl font-mono font-semibold mt-2 h-12"
                />
              </div>
            </div>

            {/* Variance Display */}
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Variance</span>
                <div className="flex items-center gap-2">
                  {isVarianceTooHigh && (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  )}
                  <span
                    className={`text-2xl font-mono font-bold ${
                      isVarianceTooHigh ? "text-destructive" : ""
                    }`}
                  >
                    {variance > 0 ? "+" : ""}
                    {variance.toFixed(2)}%
                  </span>
                </div>
              </div>
              {maxOverridePercentage !== undefined && (
                <p className="text-xs text-muted-foreground mt-2">
                  Maximum allowed variance: {maxOverridePercentage}%
                </p>
              )}
            </div>

            {/* Warnings */}
            {isVarianceTooHigh && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  The variance exceeds the maximum allowed percentage ({maxOverridePercentage}%). 
                  This override will be rejected.
                </AlertDescription>
              </Alert>
            )}

            {Math.abs(variance) > 5 && !isVarianceTooHigh && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  High variance rate override detected. Ensure you have proper justification 
                  and manager approval if required.
                </AlertDescription>
              </Alert>
            )}

            {/* Reason Input */}
            <div className="space-y-2">
              <Label htmlFor="override-reason">
                Reason for Override <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="override-reason"
                placeholder="Explain why this rate override is necessary..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                maxLength={500}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Minimum 10 characters required</span>
                <span>{reason.length}/500</span>
              </div>
            </div>

            {/* Acknowledgments */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="acknowledged"
                  checked={acknowledged}
                  onCheckedChange={(checked) => setAcknowledged(checked as boolean)}
                />
                <label
                  htmlFor="acknowledged"
                  className="text-sm leading-none cursor-pointer"
                >
                  I understand that this rate override will create an audit trail 
                  and will be reviewed by management.
                </label>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="manager-approval"
                  checked={hasManagerApproval}
                  onCheckedChange={(checked) => setHasManagerApproval(checked as boolean)}
                />
                <label
                  htmlFor="manager-approval"
                  className="text-sm leading-none cursor-pointer"
                >
                  I have obtained manager approval for this rate override
                  <span className="text-destructive">*</span>
                </label>
              </div>
            </div>

            {/* Information Alert */}
            <Alert>
              <AlertDescription className="text-sm">
                <strong>Important:</strong> Rate overrides are monitored and may trigger 
                compliance alerts. Frequent overrides or high variance rates will be flagged 
                for review.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canSubmit || loading || !!permissionError || isVarianceTooHigh}
          >
            Confirm Rate Override
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
