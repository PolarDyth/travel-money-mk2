'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { InfoIcon, ArrowLeftRight } from "lucide-react";
import { calculateExchangeAmount } from '@/lib/transaction-utils';
import { Currency, TransactionUpdateHandler } from '@/app/operator/transaction/types';

interface StepCurrencyProps {
  type: 'buy' | 'sell';
  currencyCode: string;
  foreignAmount: number;
  baseAmount: number; // GBP
  exchangeRate: number;
  currencies: Currency[];
  onUpdate: TransactionUpdateHandler;
  onNext: () => void;
  onCancel: () => void;
}

export function StepCurrency({
  type,
  currencyCode,
  foreignAmount,
  baseAmount,
  exchangeRate,
  currencies,
  onUpdate,
  onNext,
  onCancel
}: StepCurrencyProps) {
  
  // Find selected currency object to get symbol etc
  const selectedCurrency = currencies.find(c => c.code === currencyCode);

  const handleTypeChange = (newType: 'buy' | 'sell') => {
    // When switching type, re-calculate amounts based on the same foreign amount if possible
    // But rate changes.
    // For simplicity, just update type. Logic in parent or effect here handles rate lookup?
    // We expect parent to provide the correct 'exchangeRate' for the selected type/currency.
    onUpdate({ type: newType });
  };

  const handleCurrencyChange = (value: string) => {
    onUpdate({ currency_code: value });
    // Note: Parent needs to lookup new rate and update exchangeRate
  };

  const handleForeignChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value) || 0;
    // Calculate GBP: Foreign / Rate (Sell) or ... 
    // Logic: 
    // Sell: We Sell Foreign. Customer pays GBP. GBP = Foreign * SellRate? 
    // Actually usually: Rate is 1 GBP = X Foreign.
    // So Foreign / Rate = GBP.
    
    // Let's assume passed `exchangeRate` is always "Foreign per 1 GBP".
    const newBase = exchangeRate > 0 ? val / exchangeRate : 0;
    
    onUpdate({ 
      foreign_amount: val,
      base_amount: Number(newBase.toFixed(2))
    });
  };

  const handleBaseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value) || 0;
    // Foreign = GBP * Rate
    const newForeign = val * exchangeRate;
    
    onUpdate({ 
      base_amount: val,
      foreign_amount: Number(newForeign.toFixed(2))
    });
  };

  // Keyboard shortcut for Next
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'Enter') {
        if (currencyCode && foreignAmount > 0) onNext();
    }
  };

  return (
    <div onKeyDown={handleKeyDown} className="space-y-6">
      <div className="flex gap-4 mb-6">
         <Button 
            variant={type === 'sell' ? 'default' : 'outline'}
            className="flex-1 h-16 text-lg gap-2"
            onClick={() => handleTypeChange('sell')}
          >
            <ArrowLeftRight className="w-5 h-5" />
            Sell
            <Badge variant="secondary" className="ml-2">Bureau Sells</Badge>
          </Button>
          <Button 
            variant={type === 'buy' ? 'default' : 'outline'}
            className="flex-1 h-16 text-lg gap-2"
            onClick={() => handleTypeChange('buy')}
          >
            <ArrowLeftRight className="w-5 h-5" />
            Buy
            <Badge variant="secondary" className="ml-2">Bureau Buys</Badge>
          </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Curencies & Amounts</CardTitle>
          <CardDescription>Select currency and enter amount. Rate: {exchangeRate.toFixed(4)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={currencyCode} onValueChange={handleCurrencyChange}>
              <SelectTrigger autoFocus>
                <SelectValue placeholder="Select currency..." />
              </SelectTrigger>
              <SelectContent>
                {currencies.map(c => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code} - {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Foreign Amount ({selectedCurrency?.symbol || ''})</Label>
              <Input 
                type="number" 
                step="0.01"
                value={foreignAmount || ''}
                onChange={handleForeignChange}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label>GBP Amount (£)</Label>
              <Input 
                type="number" 
                step="0.01"
                value={baseAmount || ''}
                onChange={handleBaseChange}
                disabled={type === 'buy'} // Disabled for Buy as per req
                placeholder="0.00"
              />
              {type === 'buy' && (
                <p className="text-xs text-muted-foreground">
                  Locked for Buy transactions. Enter foreign amount.
                </p>
              )}
            </div>
          </div>

          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertTitle>Exchange Rate</AlertTitle>
            <AlertDescription>
                1 GBP = {exchangeRate} {currencyCode}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <div className="flex justify-between">
         <Button variant="ghost" onClick={onCancel}>Cancel</Button>
         <Button onClick={onNext} disabled={!currencyCode || foreignAmount <= 0}>
           Next (Customer)
         </Button>
      </div>
    </div>
  );
}
