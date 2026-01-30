"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { InfoIcon, RotateCcw, Calculator } from "lucide-react"
import { setBranchRate, resetBranchToGlobal } from "@/app/(dashboard)/manager/actions"
import { toast } from "sonner"

interface BranchRateEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  branchId: string
  currencyCode: string
  currencyName: string
  globalBuyRate: number
  globalSellRate: number
  currentBuyRate?: number
  currentSellRate?: number
  hasOverride: boolean
  onSave: () => void
}

export function BranchRateEditDialog({
  open,
  onOpenChange,
  branchId,
  currencyCode,
  currencyName,
  globalBuyRate,
  globalSellRate,
  currentBuyRate,
  currentSellRate,
  hasOverride,
  onSave,
}: BranchRateEditDialogProps) {
  const [buyRate, setBuyRate] = React.useState(currentBuyRate?.toFixed(6) ?? globalBuyRate.toFixed(6))
  const [sellRate, setSellRate] = React.useState(currentSellRate?.toFixed(6) ?? globalSellRate.toFixed(6))
  const [notes, setNotes] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isResetting, setIsResetting] = React.useState(false)

  const margin = parseFloat(sellRate) - parseFloat(buyRate)
  const marginPercentage = ((margin / parseFloat(buyRate)) * 100).toFixed(2)

  const isValid =
    parseFloat(buyRate) > 0 &&
    parseFloat(sellRate) > 0 &&
    parseFloat(buyRate) <= parseFloat(sellRate)

  const handleSave = async () => {
    if (!isValid) {
      toast.error("Invalid rate: Buy rate must be less than or equal to sell rate")
      return
    }

    setIsSubmitting(true)
    try {
      const result = await setBranchRate({
        currencyCode,
        buyRate: parseFloat(buyRate),
        sellRate: parseFloat(sellRate),
        notes: notes.trim() || undefined,
      })

      if (result.error) {
        toast.error(result.error.userMessage || result.error.message || "Failed to update rate")
      } else {
        toast.success(`Branch rate for ${currencyCode} updated`)
        onOpenChange(false)
        onSave()
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = async () => {
    if (!hasOverride) {
      toast.error("No branch override to reset")
      return
    }

    setIsResetting(true)
    try {
      const result = await resetBranchToGlobal({
        branchId,
        currencyCode,
      })

      if (result.error) {
        toast.error(result.error.userMessage || result.error.message || "Failed to reset rate")
      } else {
        toast.success(`Rate for ${currencyCode} reset to global`)
        onOpenChange(false)
        onSave()
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
      console.error(error)
    } finally {
      setIsResetting(false)
    }
  }

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setBuyRate(currentBuyRate?.toFixed(6) ?? globalBuyRate.toFixed(6))
      setSellRate(currentSellRate?.toFixed(6) ?? globalSellRate.toFixed(6))
      setNotes("")
    }
  }, [open, currentBuyRate, currentSellRate, globalBuyRate, globalSellRate])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Edit Branch Rate: {currencyCode} - {currencyName}
          </DialogTitle>
          <DialogDescription>
            Set branch-specific exchange rates that will override global rates for this branch.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Rate Comparison */}
          <div className="grid grid-cols-3 gap-4 rounded-lg border p-4 bg-muted/30">
            <div>
              <Label>Global Buy Rate</Label>
              <div className="text-2xl font-mono mt-2 text-muted-foreground">
                {globalBuyRate.toFixed(6)}
              </div>
            </div>
            <div>
              <Label>Global Sell Rate</Label>
              <div className="text-2xl font-mono mt-2 text-muted-foreground">
                {globalSellRate.toFixed(6)}
              </div>
            </div>
            <div>
              <Label>Global Margin</Label>
              <div className="text-2xl font-mono mt-2 text-muted-foreground">
                {(globalSellRate - globalBuyRate).toFixed(6)}
                <span className="text-sm ml-1">
                  ({(((globalSellRate - globalBuyRate) / globalBuyRate) * 100).toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Branch Rate Inputs */}
          <div className="space-y-4 rounded-lg border p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="branch-buy-rate">
                  Branch Buy Rate
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="branch-buy-rate"
                  type="number"
                  step="0.000001"
                  value={buyRate}
                  onChange={(e) => setBuyRate(e.target.value)}
                  className="text-xl font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Rate when bureau BUYS foreign currency
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch-sell-rate">
                  Branch Sell Rate
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="branch-sell-rate"
                  type="number"
                  step="0.000001"
                  value={sellRate}
                  onChange={(e) => setSellRate(e.target.value)}
                  className="text-xl font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Rate when bureau SELLS foreign currency
                </p>
              </div>
            </div>

            {/* Margin Preview */}
            <div className="flex items-center justify-between rounded-md bg-background p-3 border">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Branch Margin</span>
              </div>
              <div className="text-right">
                <div className="font-mono text-lg">
                  {margin.toFixed(6)}
                  <span className="text-sm ml-1">
                    ({marginPercentage}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Validation Alert */}
          {!isValid && (
            <Alert variant="destructive">
              <AlertDescription>
                Buy rate must be greater than 0 and less than or equal to sell rate.
              </AlertDescription>
            </Alert>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="rate-notes">Notes (Optional)</Label>
            <Textarea
              id="rate-notes"
              placeholder="Add any notes about this rate change..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <div className="text-right text-xs text-muted-foreground">
              {notes.length}/500
            </div>
          </div>

          {/* Information Alert */}
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Branch rates override global rates for this branch only.
              Changes will be logged and will take effect immediately for all transactions at this branch.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          {hasOverride && (
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={isSubmitting || isResetting}
              className="mr-auto"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {isResetting ? "Resetting..." : "Reset to Global"}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting || isResetting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isValid || isSubmitting || isResetting}
          >
            {isSubmitting ? "Saving..." : "Save Branch Rate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
