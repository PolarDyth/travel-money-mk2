"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Edit, CheckCircle } from "lucide-react"
import { getAllCurrencies, addCurrency, setCurrencyStatus } from "@/app/(dashboard)/admin/actions"
import { toast } from "sonner"

interface CurrencyData {
  code: string
  name: string
  symbol: string
  is_active: boolean
  decimal_places: number
  min_transaction_amount: number
  max_transaction_amount: number
  requires_id_threshold: number | null
}

export function CurrencyManagement() {
  const [currencies, setCurrencies] = useState<CurrencyData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyData | null>(null)

  // Add currency form state
  const [newCurrency, setNewCurrency] = useState({
    code: "",
    name: "",
    symbol: "",
    decimalPlaces: 2,
    minTransactionAmount: 1.0,
    maxTransactionAmount: 10000.0,
    requiresIdThreshold: "",
  })
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    async function fetchCurrencies() {
      setIsLoading(true)
      try {
        const result = await getAllCurrencies()
        setCurrencies(result)
      } catch (error) {
        console.error("Failed to fetch currencies:", error)
        toast.error("Failed to load currencies")
      } finally {
        setIsLoading(false)
      }
    }
    fetchCurrencies()
  }, [])

  const handleAddCurrency = async () => {
    if (!newCurrency.code || !newCurrency.name || !newCurrency.symbol) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsAdding(true)
    try {
      const result = await addCurrency({
        code: newCurrency.code.toUpperCase(),
        name: newCurrency.name,
        symbol: newCurrency.symbol,
        decimalPlaces: newCurrency.decimalPlaces,
        minTransactionAmount: newCurrency.minTransactionAmount,
        maxTransactionAmount: newCurrency.maxTransactionAmount,
        requiresIdThreshold: newCurrency.requiresIdThreshold 
          ? parseFloat(newCurrency.requiresIdThreshold)
          : undefined,
      })

      if (result.error) {
        toast.error(result.error.userMessage || result.error.message || "Failed to add currency")
      } else {
        toast.success(`Currency ${newCurrency.code.toUpperCase()} added successfully`)
        setAddDialogOpen(false)
        setNewCurrency({
          code: "",
          name: "",
          symbol: "",
          decimalPlaces: 2,
          minTransactionAmount: 1.0,
          maxTransactionAmount: 10000.0,
          requiresIdThreshold: "",
        })
        // Refresh list
        const currenciesResult = await getAllCurrencies()
        setCurrencies(currenciesResult)
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
      console.error(error)
    } finally {
      setIsAdding(false)
    }
  }

  const handleToggleStatus = async (currencyCode: string, newStatus: boolean) => {
    try {
      const result = await setCurrencyStatus({
        currencyCode,
        isEnabled: newStatus,
      })

      if (result.error) {
        toast.error(result.error.userMessage || result.error.message || "Failed to update currency status")
      } else {
        toast.success(`Currency ${currencyCode} ${newStatus ? "enabled" : "disabled"}`)
        setCurrencies(prev =>
          prev.map(c =>
            c.code === currencyCode ? { ...c, is_active: newStatus } : c
          )
        )
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
      console.error(error)
    }
  }

  const handleEditSettings = (currency: CurrencyData) => {
    setSelectedCurrency(currency)
    setEditDialogOpen(true)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Currency Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-muted/20 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Currency Management</CardTitle>
          <Button
            size="sm"
            onClick={() => setAddDialogOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Currency
          </Button>
        </CardHeader>
        <CardContent>
          {currencies.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No currencies configured
            </div>
          ) : (
            <div className="space-y-1">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase border-b">
                <div className="col-span-2">Code</div>
                <div className="col-span-3">Name</div>
                <div className="col-span-1 text-center">Symbol</div>
                <div className="col-span-2 text-right">Decimals</div>
                <div className="col-span-2 text-right">Min Amount</div>
                <div className="col-span-1 text-center">Status</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>

              {/* Rows */}
              {currencies.map((currency) => (
                <div
                  key={currency.code}
                  className="grid grid-cols-12 gap-2 px-2 py-3 text-sm items-center hover:bg-accent/50 transition-colors border-b"
                >
                  <div className="col-span-2 font-mono font-semibold">
                    {currency.code}
                  </div>
                  <div className="col-span-3">{currency.name}</div>
                  <div className="col-span-1 text-center text-lg">
                    {currency.symbol}
                  </div>
                  <div className="col-span-2 text-right">{currency.decimal_places}</div>
                  <div className="col-span-2 text-right font-mono">
                    £{currency.min_transaction_amount.toFixed(2)}
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <Switch
                      checked={currency.is_active}
                      onCheckedChange={(checked) =>
                        handleToggleStatus(currency.code, checked as boolean)
                      }
                      className="scale-75"
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleEditSettings(currency)}
                      title="Edit Settings"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Currency Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add New Currency</DialogTitle>
            <DialogDescription>
              Add a new currency to the system
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency-code">
                  Currency Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="currency-code"
                  placeholder="e.g., EUR"
                  maxLength={3}
                  value={newCurrency.code}
                  onChange={(e) =>
                    setNewCurrency({ ...newCurrency, code: e.target.value.toUpperCase() })
                  }
                  className="uppercase font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency-symbol">
                  Symbol <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="currency-symbol"
                  placeholder="e.g., €"
                  maxLength={5}
                  value={newCurrency.symbol}
                  onChange={(e) =>
                    setNewCurrency({ ...newCurrency, symbol: e.target.value })
                  }
                  className="text-2xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency-name">
                Currency Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="currency-name"
                placeholder="e.g., Euro"
                value={newCurrency.name}
                onChange={(e) =>
                  setNewCurrency({ ...newCurrency, name: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="decimal-places">
                  Decimals <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="decimal-places"
                  type="number"
                  min={0}
                  max={4}
                  value={newCurrency.decimalPlaces}
                  onChange={(e) =>
                    setNewCurrency({
                      ...newCurrency,
                      decimalPlaces: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="min-amount">
                  Min Amount <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="min-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={newCurrency.minTransactionAmount}
                  onChange={(e) =>
                    setNewCurrency({
                      ...newCurrency,
                      minTransactionAmount: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-amount">
                  Max Amount <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="max-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={newCurrency.maxTransactionAmount}
                  onChange={(e) =>
                    setNewCurrency({
                      ...newCurrency,
                      maxTransactionAmount: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="id-threshold">ID Requirement Threshold</Label>
              <Input
                id="id-threshold"
                type="number"
                step="0.01"
                min="0"
                placeholder="Amount requiring ID check"
                value={newCurrency.requiresIdThreshold}
                onChange={(e) =>
                  setNewCurrency({
                    ...newCurrency,
                    requiresIdThreshold: e.target.value,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to disable ID requirement for this currency
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
              disabled={isAdding}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddCurrency}
              disabled={isAdding || !newCurrency.code || !newCurrency.name || !newCurrency.symbol}
            >
              {isAdding ? "Adding..." : "Add Currency"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Settings Dialog - Basic placeholder for now */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Currency: {selectedCurrency?.code}</DialogTitle>
            <DialogDescription>
              Currency settings
            </DialogDescription>
          </DialogHeader>

          {selectedCurrency && (
            <div className="space-y-4 py-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  This currency has transaction limits and ID requirements. 
                  Use denomination management to configure accepted notes/coins.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Min Transaction</Label>
                  <div className="text-lg font-mono">
                    £{selectedCurrency.min_transaction_amount.toFixed(2)}
                  </div>
                </div>
                <div>
                  <Label>Max Transaction</Label>
                  <div className="text-lg font-mono">
                    £{selectedCurrency.max_transaction_amount.toFixed(2)}
                  </div>
                </div>
              </div>

              {selectedCurrency.requires_id_threshold && (
                <div>
                  <Label>ID Required Above</Label>
                  <div className="text-lg font-mono">
                    £{selectedCurrency.requires_id_threshold.toFixed(2)}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setEditDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
