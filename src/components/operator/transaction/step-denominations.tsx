'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { calculateOptimalDenominations } from '@/lib/transaction-utils';
import { Denomination, TransactionUpdateHandler } from '@/app/(dashboard)/operator/transaction/types';

interface StepDenominationsProps {
  amount: number;
  currencyCode: string;
  denominations: Denomination[]; // The full list of available denoms
  currentCounts: Array<{ denomination_id: string; count: number }>;
  onUpdate: TransactionUpdateHandler;
  onNext: () => void;
  onBack: () => void;
}

export function StepDenominations({
  amount,
  currencyCode,
  denominations,
  currentCounts,
  onUpdate,
  onNext,
  onBack
}: StepDenominationsProps) {
  
  // On mount, if no counts exist, run greedy algo
  React.useEffect(() => {
    if (currentCounts.length === 0 && denominations.length > 0) {
        const optimal = calculateOptimalDenominations(amount, denominations);
        onUpdate({ denominations: optimal });
    }
  }, [amount, denominations]); // Removed currentCounts to avoid loop if parent updates ref

  const handleCountChange = (id: string, value: string) => {
    const val = parseInt(value, 10) || 0;
    const newCounts = [...currentCounts];
    const idx = newCounts.findIndex(c => c.denomination_id === id);
    
    if (idx >= 0) {
        newCounts[idx] = { ...newCounts[idx], count: val };
    } else {
        newCounts.push({ denomination_id: id, count: val });
    }
    onUpdate({ denominations: newCounts });
  };

  const getCount = (id: string) => {
      return currentCounts.find(c => c.denomination_id === id)?.count || 0;
  };

  // Calculate total selected
  const totalSelected = React.useMemo(() => {
    return currentCounts.reduce((sum, item) => {
        const denom = denominations.find(d => d.id === item.denomination_id);
        return sum + (item.count * (denom?.value || 0));
    }, 0);
  }, [currentCounts, denominations]);

  const difference = amount - totalSelected;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                   <CardTitle>Cash Breakdown</CardTitle>
                   <CardDescription>Verify notes and coins for {currencyCode} {amount.toFixed(2)}</CardDescription>
                </div>
                <div className={`text-right ${Math.abs(difference) > 0.01 ? 'text-destructive' : 'text-green-600'}`}>
                    <div className="text-2xl font-bold">Total: {totalSelected.toFixed(2)}</div>
                    <div className="text-sm">Difference: {difference.toFixed(2)}</div>
                </div>
            </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {denominations.map((denom) => (
              <div key={denom.id} className="space-y-1">
                <Label className="text-xs text-muted-foreground">{denom.denomination_type} {denom.value}</Label>
                <div className="flex items-center gap-2">
                    <span className="font-bold w-12 text-right">{denom.value}</span>
                    <Input 
                        type="number"
                        min="0"
                        className="font-mono text-right"
                        value={getCount(denom.id) || ''}
                        onChange={(e) => handleCountChange(denom.id, e.target.value)}
                    />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
         <Button variant="outline" onClick={onBack}>Back</Button>
         <Button onClick={onNext}>
           Next (Payment)
         </Button>
      </div>
    </div>
  );
}
