'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { InfoIcon, ArrowLeftRight, Edit } from "lucide-react";
import { Currency, TransactionUpdateHandler } from '@/app/(dashboard)/operator/transaction/types';

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
  userRole?: string;
  canOverrideRate?: boolean;
  branchId?: string;
  onRateOverrideClick?: () => void;
  rateOverride?: {
    originalRate: number;
    overrideRate: number;
  };
  hasDraft?: boolean;
  onDiscardDraft?: () => void;
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
  onCancel,
  canOverrideRate,
  onRateOverrideClick,
  rateOverride,
  hasDraft,
  onDiscardDraft,
}: StepCurrencyProps) {

  // Find selected currency object to get symbol etc
  const selectedCurrency = currencies.find(c => c.code === currencyCode);

  // Determine effective rate - use override rate if available, otherwise use exchange rate
  const effectiveRate = rateOverride ? rateOverride.overrideRate : exchangeRate;

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
    const newBase = effectiveRate > 0 ? val / effectiveRate : 0;
    
    onUpdate({ 
      foreign_amount: val,
      base_amount: Number(newBase.toFixed(2))
    });
  };

  const handleBaseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value) || 0;
    // Foreign = GBP * Rate
    const newForeign = val * effectiveRate;
    
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
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>Currencies & Amounts</CardTitle>
            <CardDescription className="mt-1">Select currency and enter amount. Rate: {effectiveRate.toFixed(4)}</CardDescription>
          </div>
          {canOverrideRate && onRateOverrideClick && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRateOverrideClick}
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit Rate
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {rateOverride && (
            <Alert variant="destructive">
              <AlertTitle>Rate Override Applied</AlertTitle>
              <AlertDescription>
                Original rate: {rateOverride.originalRate.toFixed(6)} → 
                Override rate: {rateOverride.overrideRate.toFixed(6)}
              </AlertDescription>
            </Alert>
          )}
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
                1 GBP = {effectiveRate} {currencyCode}
                {rateOverride && (
                  <span className="ml-2 text-destructive font-semibold">
                    (Override Applied)
                  </span>
                )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <div className="flex justify-between gap-2">
         <div className="flex gap-2">
           <Button variant="ghost" onClick={onCancel}>Cancel</Button>
           {hasDraft && onDiscardDraft && (
             <Button variant="ghost" onClick={onDiscardDraft} className="text-destructive hover:text-destructive">
               Start Over
             </Button>
           )}
         </div>
         <Button onClick={onNext} disabled={!currencyCode || foreignAmount <= 0}>
           Next (Customer)
         </Button>
      </div>
    </div>
  );
}
