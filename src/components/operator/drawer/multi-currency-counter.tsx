'use client';

import { useState, useMemo, useEffect } from 'react';
import { DenominationWithCurrency } from '@/lib/queries/drawer';
import { DenominationCount } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface MultiCurrencyCounterProps {
  denominations: DenominationWithCurrency[];
  exchangeRates: Record<string, number>;
  
  mode: 'opening' | 'closing' | 'spot-check';
  initialCounts?: DenominationCount[];
  mandatoryCurrencies?: string[]; // ['GBP', 'USD', 'EUR']
  suggestedCurrencies?: string[]; // Currencies used in session
  onCountsChange: (counts: DenominationCount[], totalGbp: number) => void;
}

export function MultiCurrencyCounter({
  denominations,
  exchangeRates,
  mode,
  initialCounts = [],
  mandatoryCurrencies = ['GBP', 'EUR', 'USD'],
  suggestedCurrencies = [],
  onCountsChange,
}: MultiCurrencyCounterProps) {
  // State: Map<DenominationID, Count>
  const [counts, setCounts] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    initialCounts.forEach((c) => {
      initial[c.denomination_id] = c.count;
    });
    return initial;
  });

  // Derived: Active Currencies (Tabs)
  const [activeCurrencies, setActiveCurrencies] = useState<string[]>(() => {
    const base = new Set([...mandatoryCurrencies]);
    // Add currencies from initial counts
    initialCounts.forEach(c => {
      const denom = denominations.find(d => d.id === c.denomination_id);
      if (denom) base.add(denom.currency_code);
    });
    // Add suggested
    suggestedCurrencies.forEach(c => base.add(c));
    return Array.from(base);
  });
  
  const [currentTab, setCurrentTab] = useState<string>('GBP');

  // Group denominations by currency
  const denomsByCurrency = useMemo(() => {
    const grouped: Record<string, DenominationWithCurrency[]> = {};
    denominations.forEach((d) => {
      if (!grouped[d.currency_code]) grouped[d.currency_code] = [];
      grouped[d.currency_code].push(d);
    });
    return grouped;
  }, [denominations]);

  // Available currencies to add
  const availableCurrencies = useMemo(() => {
    const all = Object.keys(denomsByCurrency);
    return all.filter((c) => !activeCurrencies.includes(c));
  }, [denomsByCurrency, activeCurrencies]);

  const handleCreateTab = (currency: string) => {
    if (!activeCurrencies.includes(currency)) {
      setActiveCurrencies([...activeCurrencies, currency]);
      setCurrentTab(currency);
    }
  };

  const handleRemoveTab = (e: React.MouseEvent, currency: string) => {
    e.stopPropagation();
    if (mandatoryCurrencies.includes(currency)) return; // Cannot remove mandatory
    
    // Clear counts for this currency
    const idsToRemove = denomsByCurrency[currency]?.map(d => d.id) || [];
    setCounts(prev => {
      const next = { ...prev };
      idsToRemove.forEach(id => delete next[id]);
      return next;
    });

    setActiveCurrencies(prev => prev.filter(c => c !== currency));
    if (currentTab === currency) {
      setCurrentTab(activeCurrencies[0] || 'GBP');
    }
  };

  const handleCountChange = (id: string, val: string) => {
    const num = parseInt(val) || 0;
    setCounts((prev) => ({
      ...prev,
      [id]: num,
    }));
  };

  // Calculate Totals
  const totals = useMemo(() => {
    const currencyTotals: Record<string, number> = {};
    let totalGbpValue = 0;

    activeCurrencies.forEach(curr => {
      let subtotal = 0;
      const denoms = denomsByCurrency[curr] || [];
      denoms.forEach(d => {
        const count = counts[d.id] || 0;
        subtotal += count * d.value;
      });
      currencyTotals[curr] = subtotal;

      // Convert to GBP
      if (curr === 'GBP') {
        totalGbpValue += subtotal;
      } else {
        const rate = exchangeRates[curr];
        if (rate && rate > 0) {
          // Assuming Rate is "Foreign Units per 1 GBP" (e.g. 1.2 USD) -> GBP = USD / 1.2
          totalGbpValue += subtotal / rate;
        }
      }
    });

    return { currencyTotals, totalGbpValue };
  }, [counts, activeCurrencies, denomsByCurrency, exchangeRates]);

  // Propagate changes
  useEffect(() => {
    const countArray: DenominationCount[] = Object.entries(counts)
      .filter(([_, qty]) => qty > 0)
      .map(([id, qty]) => ({ denomination_id: id, count: qty }));
    
    onCountsChange(countArray, totals.totalGbpValue);
  }, [counts, totals.totalGbpValue]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Cash Count</h3>
        <div className="text-right">
          <span className="text-sm text-muted-foreground mr-2">Total Value (GBP):</span>
          <span className="text-xl font-bold">{formatCurrency(totals.totalGbpValue, 'GBP')}</span>
        </div>
      </div>

      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <div className="flex items-center gap-2 mb-2 w-full overflow-x-auto">
          <TabsList className="h-auto flex-wrap justify-start">
            {activeCurrencies.map((curr) => (
              <TabsTrigger key={curr} value={curr} className="relative pr-6">
                {curr}
                {!mandatoryCurrencies.includes(curr) && (
                  <div
                    role="button"
                    onClick={(e) => handleRemoveTab(e, curr)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </div>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {availableCurrencies.length > 0 && (
             <Select onValueChange={handleCreateTab}>
             <SelectTrigger className="w-[130px] h-9">
               <Plus className="h-4 w-4 mr-2" />
               <SelectValue placeholder="Add Currency" />
             </SelectTrigger>
             <SelectContent>
               {availableCurrencies.map((c) => (
                 <SelectItem key={c} value={c}>
                   {c}
                 </SelectItem>
               ))}
             </SelectContent>
           </Select>
          )}
        </div>

        {activeCurrencies.map((curr) => (
          <TabsContent key={curr} value={curr} className="mt-0">
            <Card>
              <CardHeader className="py-4">
                <div className="flex justify-between items-center">
                  <CardTitle>{curr} Count</CardTitle>
                  <CardDescription>
                    Total: {formatCurrency(totals.currencyTotals[curr] || 0, curr)}
                    {curr !== 'GBP' && (
                       <span className="ml-2">
                         (≈ {formatCurrency((totals.currencyTotals[curr] || 0) / (exchangeRates[curr] || 1), 'GBP')})
                       </span>
                    )}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                   {/* Notes */}
                   {denomsByCurrency[curr]?.filter(d => d.denomination_type === 'note').map(d => (
                     <div key={d.id} className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{d.description || formatCurrency(d.value, curr)}</Label>
                        <Input 
                          type="number" 
                          min="0"
                          // placeholder="0"
                          value={counts[d.id] || ''}
                          onChange={(e) => handleCountChange(d.id, e.target.value)}
                          className="font-mono text-right"
                        />
                     </div>
                   ))}
                </div>
                
                {denomsByCurrency[curr]?.some(d => d.denomination_type === 'coin') && (
                  <>
                    <Separator />
                    <Label className="text-sm font-semibold">Coins</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {denomsByCurrency[curr]?.filter(d => d.denomination_type === 'coin').map(d => (
                        <div key={d.id} className="space-y-1">
                            <Label className="text-xs text-muted-foreground">{d.description || formatCurrency(d.value, curr)}</Label>
                            <Input 
                              type="number" 
                              min="0"
                              value={counts[d.id] || ''}
                              onChange={(e) => handleCountChange(d.id, e.target.value)}
                              className="font-mono text-right"
                            />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
      
      {activeCurrencies.length === 0 && (
         <div className="text-center p-8 border border-dashed rounded-lg text-muted-foreground">
           No currencies selected. Please add a currency to start counting.
         </div>
      )}
    </div>
  );
}
