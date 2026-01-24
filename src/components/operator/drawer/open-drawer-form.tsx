'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DenominationWithCurrency } from '@/lib/queries/drawer';
import { MultiCurrencyCounter } from './multi-currency-counter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { openDrawerSession } from '@/app/operator/drawer/actions';
import { toast } from 'sonner';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { DenominationCount } from '@/types';

interface OpenDrawerFormProps {
  denominations: DenominationWithCurrency[];
  exchangeRates: Record<string, number>;
  branchId: string;
}

export function OpenDrawerForm({ denominations, exchangeRates, branchId }: OpenDrawerFormProps) {
  const [counts, setCounts] = useState<DenominationCount[]>([]);
  const [totalGbp, setTotalGbp] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCountsChange = (newCounts: DenominationCount[], newTotal: number) => {
    setCounts(newCounts);
    setTotalGbp(newTotal);
  };

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    
    try {
      // Logic for client-side validation could go here (e.g. minimum float check)
      
      const result = await openDrawerSession({
        counts,
        total_gbp: totalGbp,
        branch_id: branchId,
      });

      if (result.error) {
        setError(result.error);
        return;
      }
      
      // router.refresh(); // Handled by action revalidatePath
      toast.success('Drawer session opened successfully');
    } catch (e) {
      setError('An unexpected error occurred.');
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
            <MultiCurrencyCounter
                denominations={denominations}
                exchangeRates={exchangeRates}
                mode="opening"
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
        <Button size="lg" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Open Drawer
        </Button>
      </div>
    </div>
  );
}
