"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { InfoIcon, AlertTriangle } from "lucide-react"
import { updateCurrencySettings } from "@/app/(dashboard)/manager/actions"
import { toast } from "sonner"

interface CurrencySettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  branchId: string
  currencyCode: string
  currencyName: string
  currentSettings?: {
    is_enabled: boolean
    allow_rate_override: boolean
    max_override_percentage: number | null
    require_supervisor_approval: boolean
  }
  onSave: () => void
}

export function CurrencySettingsDialog({
  open,
  onOpenChange,
  branchId,
  currencyCode,
  currencyName,
  currentSettings,
  onSave,
}: CurrencySettingsDialogProps) {
  const [isEnabled, setIsEnabled] = React.useState(currentSettings?.is_enabled ?? true)
  const [allowRateOverride, setAllowRateOverride] = React.useState(currentSettings?.allow_rate_override ?? false)
  const [maxOverridePercentage, setMaxOverridePercentage] = React.useState(currentSettings?.max_override_percentage?.toString() ?? "")
  const [requireSupervisorApproval, setRequireSupervisorApproval] = React.useState(currentSettings?.require_supervisor_approval ?? true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const handleSave = async () => {
    setIsSubmitting(true)
    try {
      const result = await updateCurrencySettings({
        branchId,
        currencyCode,
        isEnabled,
        allowRateOverride,
        maxOverridePercentage: maxOverridePercentage ? parseFloat(maxOverridePercentage) : undefined,
        requireSupervisorApproval,
      })

      if (result.error) {
        toast.error(result.error.userMessage || result.error.message || "Failed to update currency settings")
      } else {
        toast.success(`Currency settings for ${currencyCode} updated`)
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

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!open && currentSettings) {
      setIsEnabled(currentSettings.is_enabled)
      setAllowRateOverride(currentSettings.allow_rate_override)
      setMaxOverridePercentage(currentSettings.max_override_percentage?.toString() ?? "")
      setRequireSupervisorApproval(currentSettings.require_supervisor_approval)
    }
  }, [open, currentSettings])

  const isValid =
    isEnabled &&
    (!allowRateOverride || (maxOverridePercentage === "" || (parseFloat(maxOverridePercentage) >= 0 && parseFloat(maxOverridePercentage) <= 100)))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            Currency Settings: {currencyCode} - {currencyName}
          </DialogTitle>
          <DialogDescription>
            Configure branch-specific settings for this currency
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Currency Status */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="currency-enabled">Enable Currency</Label>
              <p className="text-xs text-muted-foreground">
                Make this currency available for transactions at your branch
              </p>
            </div>
            <Switch
              id="currency-enabled"
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
            />
          </div>

          {/* Rate Override Permission */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="rate-override">Allow Rate Override</Label>
              <p className="text-xs text-muted-foreground">
                Allow supervisors to override exchange rates for this currency
              </p>
            </div>
            <Switch
              id="rate-override"
              checked={allowRateOverride}
              onCheckedChange={setAllowRateOverride}
              disabled={!isEnabled}
            />
          </div>

          {/* Override Settings */}
          {allowRateOverride && (
            <div className="space-y-4 rounded-lg border p-4 bg-muted/20">
              <div className="space-y-2">
                <Label htmlFor="max-override">
                  Maximum Override Percentage
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="max-override"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="e.g., 5.0"
                  value={maxOverridePercentage}
                  onChange={(e) => setMaxOverridePercentage(e.target.value)}
                  disabled={!allowRateOverride}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum percentage variance supervisors can apply (e.g., 5.0 = 5%)
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="supervisor-approval">
                    Require Supervisor Approval
                    <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Override must be approved by a supervisor
                  </p>
                </div>
                <Switch
                  id="supervisor-approval"
                  checked={requireSupervisorApproval}
                  onCheckedChange={setRequireSupervisorApproval}
                  disabled={!allowRateOverride}
                />
              </div>
            </div>
          )}

          {!allowRateOverride && isEnabled && (
            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertDescription>
                Rate override is disabled. Supervisors cannot modify rates for this currency.
              </AlertDescription>
            </Alert>
          )}

          {!isEnabled && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> Currency is disabled. It will not be available 
                for transactions at this branch, even if it&apos;s enabled globally.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
