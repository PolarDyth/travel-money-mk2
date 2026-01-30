'use client';

import { useState } from 'react';
import { DenominationWithCurrency, DrawerSummary } from '@/lib/queries/drawer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { CloseDrawerForm } from './close-drawer-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { MultiCurrencyCounter } from './multi-currency-counter';
import { DenominationCount } from '@/types';
import { Calculator, Lock } from 'lucide-react';

interface ActiveSessionViewProps {
  session: DrawerSummary;
  denominations: DenominationWithCurrency[];
  exchangeRates: Record<string, number>;
}

export function ActiveSessionView({ session, denominations, exchangeRates }: ActiveSessionViewProps) {
  const [mode, setMode] = useState<'view' | 'close'>('view');
  
  if (mode === 'close') {
    return (
        <CloseDrawerForm 
            session={session} 
            denominations={denominations} 
            exchangeRates={exchangeRates} 
            onCancel={() => setMode('view')} 
        />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
         <div>
            <h1 className="text-3xl font-bold tracking-tight">Active Session</h1>
            <p className="text-muted-foreground">Session ID: {session.sessionId.slice(0, 8)}...</p>
         </div>
         <div className="flex gap-3">
             <SpotCheckDialog 
                session={session} 
                denominations={denominations} 
                exchangeRates={exchangeRates} 
             />
             <Button onClick={() => setMode('close')} variant="default">
                <Lock className="mr-2 h-4 w-4" />
                Close Drawer
             </Button>
         </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Opening Float</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(session.openingFloatGbp, 'GBP')}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{session.transactionsCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Expected Drawer Balance</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(session.expectedGbp, 'GBP')}</div>
                <p className="text-xs text-muted-foreground">Combined value of all currencies</p>
            </CardContent>
          </Card>
      </div>

      <Card>
         <CardHeader>
            <CardTitle>Currency Holdings Breakdown</CardTitle>
            <CardDescription>Theoretical expected amounts based on transactions.</CardDescription>
         </CardHeader>
         <CardContent>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 {Object.entries(session.expectedForeign).filter(([, val]) => Math.abs(val) > 0.01).map(([code, val]) => (
                     <div key={code} className="p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
                         <div className="text-sm text-muted-foreground">{code}</div>
                         <div className="text-lg font-bold font-mono">{formatCurrency(val, code)}</div>
                     </div>
                 ))}
                 {/* Always show GBP */}
                 {!session.expectedForeign['GBP'] && (
                      <div className="p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
                         <div className="text-sm text-muted-foreground">GBP</div>
                         <div className="text-lg font-bold font-mono">{formatCurrency(session.expectedGbp, 'GBP')}</div>
                     </div>
                 )}
             </div>
         </CardContent>
      </Card>
    </div>
  );
}

function SpotCheckDialog({ denominations, exchangeRates }: Omit<ActiveSessionViewProps, 'session'>) {
    const [, setCounts] = useState<DenominationCount[]>([]);
    const [, setTotalGbp] = useState(0);
    
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Calculator className="mr-2 h-4 w-4" />
                    Spot Check
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Drawer Spot Check</DialogTitle>
                    <DialogDescription>
                        Verify cash levels without closing the session.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                    <MultiCurrencyCounter
                        denominations={denominations}
                        exchangeRates={exchangeRates}
                        mode="spot-check"
                        mandatoryCurrencies={[]} // No Mandatory for spot check
                        onCountsChange={(c, t) => {
                            setCounts(c);
                            setTotalGbp(t);
                        }}
                    />
                    
                    <div className="rounded-md border p-4 bg-muted/50">
                        <h4 className="font-semibold mb-2">Variance Check</h4>
                         <div className="text-sm text-muted-foreground">
                            Note: Compare your counted amounts above with the theoretical breakdown on the main screen. 
                            (Automatic detailed variance breakdown per currency not implementing in this view).
                         </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
