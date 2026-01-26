"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { History, ChevronDown, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getRecentTransactions, voidTransaction } from "@/lib/queries/operator";
import type { Transaction } from "@/types";

type RecentTransactionsProps = {
  branchId: string;
  operatorId: string;
  onViewJournal?: () => void;
};

type FilterType = "all" | "buy" | "sell";

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(amount: number | string): string {
  return Number(amount).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function RecentTransactions({
  branchId,
  operatorId,
  onViewJournal,
}: RecentTransactionsProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [isVoiding, setIsVoiding] = useState(false);

  const fetchTransactions = useCallback(
    async (offset: number = 0) => {
      const { transactions: txns, hasMore: more } = await getRecentTransactions(
        branchId,
        5,
        offset
      );

      if (offset === 0) {
        setTransactions(txns);
      } else {
        setTransactions((prev) => [...prev, ...txns]);
      }
      setHasMore(more);
    },
    [branchId]
  );

  useEffect(() => {
    setIsLoading(true);
    fetchTransactions().finally(() => setIsLoading(false));
  }, [fetchTransactions]);

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    await fetchTransactions(transactions.length);
    setIsLoadingMore(false);
  };

  const handleVoidClick = (txn: Transaction) => {
    setSelectedTxn(txn);
    setVoidDialogOpen(true);
  };

  const handleVoidConfirm = async () => {
    if (!selectedTxn) return;

    setIsVoiding(true);
    const result = await voidTransaction(
      selectedTxn.id,
      operatorId,
      "Voided by operator"
    );

    if (result.success) {
      // Refresh transactions
      await fetchTransactions();
    }

    setIsVoiding(false);
    setVoidDialogOpen(false);
    setSelectedTxn(null);
  };

  // Filter transactions
  const filteredTransactions = transactions.filter((txn) => {
    if (filter === "all") return true;
    return txn.transaction_type === filter;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-20" />
        </div>
        <Skeleton className="flex-1 min-h-[200px]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-black flex items-center gap-2 uppercase tracking-wide">
          <History className="w-5 h-5 text-[#C5A065]" />
          Recent Activity
        </h3>
        <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
          <SelectTrigger className="w-20 h-8 rounded-none border-zinc-300">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="buy">Buy</SelectItem>
            <SelectItem value="sell">Sell</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="flex-1 border-zinc-200 shadow-sm rounded-none">
        <CardContent className="p-0">
          {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">
              <History className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
              <p className="text-sm">No transactions found</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {filteredTransactions.map((txn) => (
                <div
                  key={txn.id}
                  className={cn(
                    "p-4 hover:bg-zinc-50 transition-colors flex items-center justify-between group",
                    txn.status === "voided" && "opacity-50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-1 h-10",
                        txn.transaction_type === "buy"
                          ? "bg-[#C5A065]"
                          : "bg-black"
                      )}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-black">
                          {txn.transaction_type === "buy" ? "Bought" : "Sold"}{" "}
                          {formatCurrency(txn.foreign_amount ?? 0)}{" "}
                          {txn.foreign_currency_code}
                        </p>
                        {txn.status === "voided" && (
                          <Badge
                            variant="secondary"
                            className="text-xs bg-red-100 text-red-700"
                          >
                            Voided
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 font-mono">
                        {txn.reference_number} {formatTime(txn.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-black">
                      £{formatCurrency(txn.base_amount ?? 0)}
                    </p>
                    {txn.status === "completed" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity px-2 cursor-pointer rounded-none"
                        onClick={() => handleVoidClick(txn)}
                      >
                        Void
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {hasMore && (
            <div className="p-3 border-t border-zinc-100">
              <Button
                variant="ghost"
                className="w-full text-zinc-600 cursor-pointer"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  "Loading..."
                ) : (
                  <>
                    Load More
                    <ChevronDown className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          )}

          <div className="p-4 border-t border-zinc-100">
            <Button
              variant="outline"
              className="w-full text-zinc-600 cursor-pointer rounded-none border-zinc-300 hover:bg-black hover:text-white"
              onClick={onViewJournal}
            >
              View Daily Journal
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Void Confirmation Dialog */}
      <Dialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
        <DialogContent className="rounded-none">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Confirm Void Transaction
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. The transaction will be marked as
              voided and recorded in the audit log.
            </DialogDescription>
          </DialogHeader>

          {selectedTxn && (
            <div className="p-4 bg-zinc-50 border border-zinc-200">
              <p className="font-semibold">
                {selectedTxn.reference_number}
              </p>
              <p className="text-sm text-zinc-600">
                {selectedTxn.transaction_type === "buy" ? "Bought" : "Sold"}{" "}
                {formatCurrency(selectedTxn.foreign_amount ?? 0)}{" "}
                {selectedTxn.foreign_currency_code} for £
                {formatCurrency(selectedTxn.base_amount ?? 0)}
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setVoidDialogOpen(false)}
              className="cursor-pointer rounded-none"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleVoidConfirm}
              disabled={isVoiding}
              className="cursor-pointer rounded-none"
            >
              {isVoiding ? "Voiding..." : "Void Transaction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
