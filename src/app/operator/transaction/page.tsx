import { Suspense } from 'react';
import { TransactionWizard } from '@/components/operator/transaction/transaction-wizard';
import { getCurrencies, getDailyRates } from '@/app/operator/transaction/actions';
import { createClient } from '@/utils/supabase/server';
import { Loader2 } from 'lucide-react';

export default async function TransactionPage() {
    // Parallel data fetching
    const currenciesPromise = getCurrencies();
    const ratesPromise = getDailyRates();
    
    // We also need all denominations to pass to the wizard for client-side filtering
    const supabase = await createClient();
    const { data: denominations } = await supabase
        .from('currency_denominations')
        .select('*')
        .eq('is_active', true)
        .order('value', { ascending: false });

    const [currencies, rates] = await Promise.all([currenciesPromise, ratesPromise]);

    return (
        <div className="container mx-auto p-6 min-h-screen">
            <h1 className="text-3xl font-bold tracking-tight mb-2">New Transaction</h1>
            <p className="text-muted-foreground mb-8">
                Record a buy or sell transaction. Ensure customer ID is verified for large amounts.
            </p>
            
            <Suspense fallback={<div className="flex h-[400px] items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground"/></div>}>
                <TransactionWizard 
                    currencies={currencies} 
                    rates={rates}
                    latestDenominations={denominations || []}
                />
            </Suspense>
        </div>
    );
}
