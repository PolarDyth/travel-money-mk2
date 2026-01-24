'use client';

import { useState } from 'react';
import { DenominationWithCurrency, DrawerSummary } from '@/lib/queries/drawer';
import { MultiCurrencyCounter } from './multi-currency-counter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { closeDrawerSession } from '@/app/operator/drawer/actions';
import { AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { DenominationCount } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface CloseDrawerFormProps {
  session: DrawerSummary;
  denominations: DenominationWithCurrency[];
  exchangeRates: Record<string, number>;
  onCancel: () => void;
}

export function CloseDrawerForm({ session, denominations, exchangeRates, onCancel }: CloseDrawerFormProps) {
  const [counts, setCounts] = useState<DenominationCount[]>([]);
  const [totalGbpCounted, setTotalGbpCounted] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCountsChange = (newCounts: DenominationCount[], newTotal: number) => {
    setCounts(newCounts);
    setTotalGbpCounted(newTotal);
  };

  const variance = totalGbpCounted - session.expectedGbp;
  const varianceColor = Math.abs(variance) < 0.05 ? 'text-green-600' : variance > 0 ? 'text-blue-600' : 'text-red-600';

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    
    try {
      const result = await closeDrawerSession({
        session_id: session.sessionId,
        counts,
        total_gbp: totalGbpCounted,
        expected_gbp: session.expectedGbp,
      });

      if (result.error) {
        setError(result.error);
        return;
      }
      // Success handled by revalidate
    } catch (e) {
      setError('An unexpected error occurred.');
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine currencies that were used in the session to suggest them
  const usedCurrencies = Object.keys(session.expectedForeign).filter(c => Math.abs(session.expectedForeign[c]) > 0.01);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="sm" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Close Drawer</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
         <Card>
            <CardHeader>
                <CardTitle>Session Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Opening Float:</span>
                    <span className="font-mono">{formatCurrency(session.openingFloatGbp, 'GBP')}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Transactions:</span>
                    <span>{session.transactionsCount}</span>
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                    <span>Expected Cash (GBP):</span>
                    <span className="font-mono">{formatCurrency(session.expectedGbp, 'GBP')}</span>
                </div>
            </CardContent>
         </Card>

         <Card>
            <CardHeader>
                <CardTitle>Reconciliation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                 <div className="flex justify-between">
                    <span className="text-muted-foreground">Counted Total (GBP):</span>
                    <span className="font-mono">{formatCurrency(totalGbpCounted, 'GBP')}</span>
                </div>
                 <div className="border-t pt-2 mt-2 flex justify-between font-bold items-center">
                    <span>Variance:</span>
                    <span className={`font-mono text-xl ${varianceColor}`}>
                        {variance > 0 ? '+' : ''}{formatCurrency(variance, 'GBP')}
                    </span>
                </div>
                {Math.abs(variance) > 0.05 && (
                    <p className="text-xs text-muted-foreground mt-2">
                        Positive variance means OVER. Negative means SHORT.
                    </p>
                )}
            </CardContent>
         </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
            <MultiCurrencyCounter
                denominations={denominations}
                exchangeRates={exchangeRates}
                mode="closing"
                mandatoryCurrencies={['GBP', 'USD', 'EUR']}
                suggestedCurrencies={usedCurrencies}
                onCountsChange={handleCountsChange}
            />
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
             Cancel
        </Button>
        <Button size="lg" onClick={handleSubmit} disabled={isSubmitting} variant={Math.abs(variance) > 5 ? "destructive" : "default"}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {Math.abs(variance) > 5 ? 'Confirm with Variance' : 'Close Drawer'}
        </Button>
      </div>
    </div>
  );
}
