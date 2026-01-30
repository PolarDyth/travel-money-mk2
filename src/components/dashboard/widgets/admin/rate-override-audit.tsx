"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RateOverrideHistoryWithDetails } from "@/types"
import { getRateOverrideHistory } from "@/lib/queries"
import { AlertTriangle, Download, Filter, Search } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

export function RateOverrideAudit() {
  const [overrides, setOverrides] = useState<RateOverrideHistoryWithDetails[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [isLoading, setIsLoading] = useState(true)

  // Filters
  const [branchFilter, setBranchFilter] = useState<string>("")
  const [currencyFilter, setCurrencyFilter] = useState<string>("")
  const [dateFromFilter, setDateFromFilter] = useState<string>("")
  const [dateToFilter, setDateToFilter] = useState<string>("")

  useEffect(() => {
    async function fetchOverrides() {
      setIsLoading(true)
      try {
        const result = await getRateOverrideHistory({
          branchId: branchFilter || undefined,
          currencyCode: currencyFilter || undefined,
          startDate: dateFromFilter || undefined,
          endDate: dateToFilter || undefined,
          page,
          pageSize,
        })

        setOverrides(result.overrides)
        setTotal(result.total)
      } catch (error) {
        console.error("Failed to fetch rate overrides:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchOverrides()
  }, [page, pageSize, branchFilter, currencyFilter, dateFromFilter, dateToFilter])

  const handleSearch = () => {
    setPage(1)
  }

  const handleExport = () => {
    // Create CSV from current overrides
    const headers = [
      "Date",
      "Reference",
      "Branch",
      "Currency",
      "Original Rate",
      "Override Rate",
      "Variance %",
      "Approved By",
      "Role",
      "Reason",
    ]

    const csvContent = [
      headers.join(","),
      ...overrides.map(override => [
        new Date(override.approved_at).toLocaleDateString(),
        override.transaction_reference,
        override.branch_name,
        override.currency_code,
        override.original_rate.toFixed(6),
        override.override_rate.toFixed(6),
        override.override_percentage?.toFixed(2) || "",
        override.approved_by_name,
        override.approved_by_role,
        override.override_reason.replace(/,/g, ";"), // Escape commas in reason
      ].join(",")),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `rate-override-audit-${new Date().toISOString().slice(0, 10)}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const totalPages = Math.ceil(total / pageSize)
  const displayOverrides = overrides

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Rate Override Audit
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="gap-2"
            disabled={isLoading || overrides.length === 0}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="branch-filter">Branch</Label>
            <Input
              id="branch-filter"
              placeholder="All branches"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency-filter">Currency</Label>
            <Input
              id="currency-filter"
              placeholder="All currencies"
              value={currencyFilter}
              onChange={(e) => setCurrencyFilter(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date-from">Date From</Label>
            <Input
              id="date-from"
              type="date"
              value={dateFromFilter}
              onChange={(e) => setDateFromFilter(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date-to">Date To</Label>
            <Input
              id="date-to"
              type="date"
              value={dateToFilter}
              onChange={(e) => setDateToFilter(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSearch} disabled={isLoading}>
            <Search className="mr-2 h-4 w-4" />
            Search
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setBranchFilter("")
              setCurrencyFilter("")
              setDateFromFilter("")
              setDateToFilter("")
              setPage(1)
            }}
          >
            Clear Filters
          </Button>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : displayOverrides.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Filter className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p>No rate overrides found</p>
              <p className="text-sm">
                Try adjusting your filters or date range
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Original Rate</TableHead>
                  <TableHead>Override Rate</TableHead>
                  <TableHead>Variance %</TableHead>
                  <TableHead>Approved By</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayOverrides.map((override) => {
                  const variance = override.override_percentage || 0
                  const isHighVariance = variance > 10

                  return (
                    <TableRow key={override.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-mono text-sm">
                            {new Date(override.approved_at).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(override.approved_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">
                        {override.transaction_reference}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div>{override.branch_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {override.branch_code}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-semibold">{override.currency_code}</div>
                          <div className="text-xs text-muted-foreground">
                            {override.currency_name}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {override.original_rate.toFixed(6)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {override.override_rate.toFixed(6)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={isHighVariance ? "destructive" : "secondary"}
                          className="font-mono"
                        >
                          {variance > 0 ? "+" : ""}
                          {variance.toFixed(2)}%
                          {isHighVariance && (
                            <AlertTriangle className="ml-1 h-3 w-3 inline" />
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">
                            {override.approved_by_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(override.approved_at).toLocaleDateString()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {override.approved_by_role}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate text-sm" title={override.override_reason}>
                          {override.override_reason}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination */}
        {!isLoading && total > 0 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="py-2 text-sm">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
