"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Edit, Trash2, AlertTriangle, Banknote, Coins } from "lucide-react"
import { getCurrencyDenominations, addDenomination, updateDenomination, deleteDenomination } from "@/app/(dashboard)/admin/actions"
import { toast } from "sonner"

interface Denomination {
  id: string
  type: "note" | "coin"
  value: number
  description: string | null
  sort_order: number
  is_active: boolean
}

interface CurrencyData {
  code: string
  name: string
  symbol: string
}

export function DenominationManagement() {
  const [currencies, setCurrencies] = useState<CurrencyData[]>([])
  const [selectedCurrency, setSelectedCurrency] = useState<string>("GBP")
  const [denominations, setDenominations] = useState<Denomination[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedDenomination, setSelectedDenomination] = useState<Denomination | null>(null)

  // Form states
  const [formData, setFormData] = useState({
    type: "note" as "note" | "coin",
    value: "",
    description: "",
    sortOrder: 0,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    // Would fetch currencies in real implementation
    setCurrencies([
      { code: "GBP", name: "British Pound", symbol: "£" },
      { code: "EUR", name: "Euro", symbol: "€" },
      { code: "USD", name: "US Dollar", symbol: "$" },
    ])
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (selectedCurrency) {
      loadDenominations(selectedCurrency)
    }
  }, [selectedCurrency])

  const loadDenominations = async (currencyCode: string) => {
    setIsLoading(true)
    try {
      const result = await getCurrencyDenominations(currencyCode)
      setDenominations(result)
    } catch (error) {
      console.error("Failed to load denominations:", error)
      toast.error("An error occurred loading denominations")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddDenomination = async () => {
    if (!formData.value || !formData.type) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsSubmitting(true)
    try {
      const result = await addDenomination({
        currencyCode: selectedCurrency,
        type: formData.type,
        value: parseFloat(formData.value),
        description: formData.description || undefined,
        sortOrder: formData.sortOrder,
      })

      if (result.error) {
        toast.error(result.error.userMessage || result.error.message || "Failed to add denomination")
      } else {
        toast.success("Denomination added successfully")
        setAddDialogOpen(false)
        setFormData({ type: "note", value: "", description: "", sortOrder: 0 })
        await loadDenominations(selectedCurrency)
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateDenomination = async () => {
    if (!selectedDenomination) return

    setIsSubmitting(true)
    try {
      const result = await updateDenomination({
        id: selectedDenomination.id,
        value: formData.value ? parseFloat(formData.value) : undefined,
        description: formData.description || undefined,
        is_active: selectedDenomination.is_active,
      })

      if (result.error) {
        toast.error(result.error.userMessage || result.error.message || "Failed to update denomination")
      } else {
        toast.success("Denomination updated successfully")
        setEditDialogOpen(false)
        await loadDenominations(selectedCurrency)
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteDenomination = async () => {
    if (!selectedDenomination) return

    setIsSubmitting(true)
    try {
      const result = await deleteDenomination(selectedDenomination.id)

      if (result.error) {
        toast.error(result.error.userMessage || result.error.message || "Failed to delete denomination")
      } else {
        toast.success("Denomination deleted successfully")
        setDeleteDialogOpen(false)
        setSelectedDenomination(null)
        await loadDenominations(selectedCurrency)
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const openAddDialog = () => {
    setFormData({ type: "note", value: "", description: "", sortOrder: 0 })
    setAddDialogOpen(true)
  }

  const openEditDialog = (denomination: Denomination) => {
    setSelectedDenomination(denomination)
    setFormData({
      type: denomination.type,
      value: denomination.value.toString(),
      description: denomination.description || "",
      sortOrder: denomination.sort_order,
    })
    setEditDialogOpen(true)
  }

  const openDeleteDialog = (denomination: Denomination) => {
    setSelectedDenomination(denomination)
    setDeleteDialogOpen(true)
  }

  if (isLoading && currencies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Denomination Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-muted/20 rounded" />
            <div className="h-12 bg-muted/20 rounded" />
            <div className="h-12 bg-muted/20 rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Denomination Management</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Configure notes and coins for each currency
            </p>
          </div>
        </CardHeader>
      </Card>

      {/* Currency Selection */}
      <Card>
        <CardContent className="pt-6">
          <Label>Select Currency</Label>
          <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Select a currency" />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((currency) => (
                <SelectItem key={currency.code} value={currency.code}>
                  {currency.code} - {currency.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Denominations List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Denominations for {selectedCurrency}
            </CardTitle>
            <Button
              size="sm"
              onClick={openAddDialog}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Denomination
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted/20 rounded animate-pulse" />
              ))}
            </div>
          ) : denominations.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Banknote className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p>No denominations configured for {selectedCurrency}</p>
              <Button
                variant="outline"
                onClick={openAddDialog}
                className="mt-4"
              >
                Add First Denomination
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {denominations.map((denom) => (
                <div
                  key={denom.id}
                  className={`flex items-center justify-between rounded-lg border p-4 transition-colors ${
                    !denom.is_active
                      ? "opacity-50 bg-muted/30"
                      : "hover:bg-accent/50"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        denom.type === "note" ? "bg-amber-100" : "bg-slate-200"
                      }`}
                    >
                      {denom.type === "note" ? (
                        <Banknote className="h-5 w-5 text-amber-700" />
                      ) : (
                        <Coins className="h-5 w-5 text-slate-700" />
                      )}
                    </div>

                    <div>
                      <div className="font-semibold text-lg font-mono">
                        {selectedCurrency} {denom.value.toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {denom.description || `${denom.type} denomination`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!denom.is_active && (
                      <span className="text-xs text-muted-foreground">
                        Disabled
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(denom)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteDialog(denom)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Denomination Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Denomination</DialogTitle>
            <DialogDescription>
              Add a new note or coin denomination for {selectedCurrency}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: "note" | "coin") =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="note">Note</SelectItem>
                    <SelectItem value="coin">Coin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Value</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g., 20.00"
                  value={formData.value}
                  onChange={(e) =>
                    setFormData({ ...formData, value: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea
                placeholder="e.g., £20 note"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={2}
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input
                type="number"
                min="0"
                placeholder="0 = highest value"
                value={formData.sortOrder}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sortOrder: parseInt(e.target.value) || 0,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Higher values appear first in lists
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddDenomination}
              disabled={isSubmitting || !formData.value || !formData.type}
            >
              {isSubmitting ? "Adding..." : "Add Denomination"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Denomination Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Denomination</DialogTitle>
            <DialogDescription>
              Modify denomination for {selectedCurrency}
            </DialogDescription>
          </DialogHeader>

          {selectedDenomination && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: "note" | "coin") =>
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="note">Note</SelectItem>
                      <SelectItem value="coin">Coin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Value</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.value}
                    onChange={(e) =>
                      setFormData({ ...formData, value: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Textarea
                  placeholder="e.g., £20 note"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={2}
                  maxLength={50}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={selectedDenomination.is_active}
                  onCheckedChange={(checked) =>
                    setSelectedDenomination({
                      ...selectedDenomination,
                      is_active: checked,
                    })
                  }
                />
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">
                  Disable instead of delete if denomination has been used in transactions
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateDenomination}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Updating..." : "Update Denomination"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Denomination Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Denomination</DialogTitle>
            <DialogDescription>
              This action cannot be undone
            </DialogDescription>
          </DialogHeader>

          {selectedDenomination && (
            <div className="space-y-4 py-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  You are about to delete the {selectedDenomination.type} 
                  denomination with value {selectedDenomination.value.toFixed(2)}
                </AlertDescription>
              </Alert>

              <div className="rounded-lg bg-muted/20 p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Currency</Label>
                    <div className="text-lg font-mono">{selectedCurrency}</div>
                  </div>
                  <div>
                    <Label>Value</Label>
                    <div className="text-lg font-mono">
                      {selectedDenomination.value.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteDenomination}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Deleting..." : "Delete Denomination"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
