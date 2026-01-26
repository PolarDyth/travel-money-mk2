'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Printer } from "lucide-react";
import { TransactionDraft } from '@/app/(dashboard)/operator/transaction/actions';

interface StepSuccessProps {
  data: TransactionDraft;
  transactionId?: string;
  onReset: () => void;
}

export function StepSuccess({
    data,
    transactionId,
    onReset
}: StepSuccessProps) {
  
  const handlePrint = () => {
      window.print(); 
  };
  
  // Keyboard: Enter to print, Esc to new
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
        if (e.key === 'Enter') handlePrint();
        if (e.key === 'Escape') onReset();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onReset]);

  return (
    <div className="space-y-6 max-w-md mx-auto print:max-w-none print:w-full">
      <Card className="text-center print:shadow-none print:border-none">
        
        <CardHeader className="print:hidden">
            <div className="mx-auto bg-green-100 text-green-600 rounded-full p-3 mb-4 w-16 h-16 flex items-center justify-center">
                 <CheckCircle2 className="w-8 h-8"/>
            </div>
          <CardTitle>Transaction Complete</CardTitle>
          <CardDescription>Transaction ID: {transactionId}</CardDescription>
        </CardHeader>

        {/* This section is visible on screen AND print */}
        <CardContent className="space-y-4 text-left">
            <div className="border rounded-md p-6 space-y-4 font-mono text-sm print:border-0 print:p-0">
                <div className="text-center font-bold text-lg mb-4 border-b pb-4">
                    TRAVEL MONEY BUREAU<br/>
                    RECEIPT
                </div>
                
                <div className="flex justify-between">
                    <span>TYPE</span>
                    <span className="uppercase">{data.type}</span>
                </div>
                 <div className="flex justify-between">
                    <span>CURRENCY</span>
                    <span>{data.currency_code}</span>
                </div>
                 <div className="flex justify-between">
                    <span>FOREIGN AMT</span>
                    <span>{data.foreign_amount.toFixed(2)}</span>
                </div>
                 <div className="flex justify-between">
                    <span>RATE</span>
                    <span>{data.exchange_rate.toFixed(4)}</span>
                </div>
                 <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                    <span>TOTAL GBP</span>
                    <span>£{data.base_amount.toFixed(2)}</span>
                </div>
                
                <div className="pt-4 text-xs text-center text-muted-foreground">
                    {data.customer ? `Customer: ${data.customer.first_name || ''} ${data.customer.last_name || ''}` : 'Walk-in Customer'}
                    <br/>
                    {new Date().toLocaleString()}
                </div>
            </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 print:hidden">
             <Button size="lg" className="w-full gap-2" onClick={handlePrint}>
                <Printer className="w-4 h-4"/> Print Receipt (Enter)
             </Button>
             <Button variant="outline" className="w-full" onClick={onReset}>
                New Transaction (Esc)
             </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
