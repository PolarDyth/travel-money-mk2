'use client';

import * as React from 'react';
import { useTransaction } from './use-transaction';
import { Stepper } from "@/components/ui/stepper";
import { StepCurrency } from './step-currency';
import { StepCustomer } from './step-customer';
import { StepDenominations } from './step-denominations';
import { StepReview } from './step-review';
import { StepSuccess } from './step-success';
import { submitTransaction } from '@/app/operator/transaction/actions';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Currency, ExchangeRate, Denomination } from "@/app/operator/transaction/types";

interface TransactionWizardProps {
  currencies: Currency[];
  rates: ExchangeRate[]; 
  latestDenominations: Denomination[]; 
}

const STEPS = [
  { title: "Currency", description: "Select currency & amount" },
  { title: "Customer", description: "Details & ID check" },
  { title: "Cash", description: "Denominations" },
  { title: "Review", description: "Payment & Confirm" },
];

export function TransactionWizard({ currencies, rates, latestDenominations }: TransactionWizardProps) {
  const { state, update, goToStep, reset } = useTransaction();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [createdTxnId, setCreatedTxnId] = React.useState<string>();

  // Use simple warning for navigation
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.step !== 'currency' && state.step !== 'success') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.step]);

  // Filter currencies to only those that have a configured exchange rate
  const availableCurrencies = React.useMemo(() => {
    const supportedCodes = new Set(rates.map(r => r.currency_code));
    return currencies.filter(c => supportedCodes.has(c.code));
  }, [currencies, rates]);

  // Resolve current rate
  const currentRate = React.useMemo(() => {
    if (!state.currency_code) return 0;
    // Find rate record for this currency
    const rateRecord = rates.find(r => r.currency_code === state.currency_code);
    if (!rateRecord) return 0;
    
    return state.type === 'buy' ? rateRecord.buy_rate : rateRecord.sell_rate;
  }, [rates, state.currency_code, state.type]);

  // Update effect to sync rate in state if it changes context (rare but correct)
  React.useEffect(() => {
    if (state.exchange_rate !== currentRate) {
        update({ exchange_rate: currentRate });
    }
  }, [currentRate, update, state.exchange_rate]);

  // Filter denominations for current currency
  const activeDenoms = React.useMemo(() => {
     return latestDenominations.filter(d => d.currency_code === state.currency_code);
  }, [latestDenominations, state.currency_code]);


  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
        const result = await submitTransaction(state);
        if (result.error) {
            setError(result.error);
        } else {
            setCreatedTxnId(result.transactionId);
            goToStep('success');
        }
    } catch (e) {
        setError("An unexpected error occurred.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const currentStepIndex = STEPS.findIndex(s => {
      // Map WizardStep string to index
      if (state.step === 'currency') return s.title === 'Currency';
      if (state.step === 'customer') return s.title === 'Customer';
      if (state.step === 'denominations') return s.title === 'Cash';
      if (state.step === 'review') return s.title === 'Review';
      return false;
  });

  if (state.step === 'success') {
      return <StepSuccess data={state} transactionId={createdTxnId} onReset={reset} />;
  }

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-8">
      <Stepper 
        steps={STEPS} 
        currentStep={currentStepIndex} 
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {state.step === 'currency' && (
        <StepCurrency
            type={state.type}
            currencyCode={state.currency_code}
            foreignAmount={state.foreign_amount}
            baseAmount={state.base_amount}
            exchangeRate={currentRate}
            currencies={availableCurrencies}
            onUpdate={update}
            onNext={() => goToStep('customer')}
            onCancel={() => window.history.back()}
        />
      )}

      {state.step === 'customer' && (
        <StepCustomer
            baseAmount={state.base_amount}
            customer={state.customer}
            onUpdate={update}
            onNext={() => goToStep('denominations')}
            onBack={() => goToStep('currency')}
        />
      )}

       {state.step === 'denominations' && (
        <StepDenominations
            amount={state.foreign_amount}
            currencyCode={state.currency_code}
            denominations={activeDenoms}
            currentCounts={state.denominations}
            onUpdate={update}
            onNext={() => goToStep('review')}
            onBack={() => goToStep('customer')}
        />
      )}

      {state.step === 'review' && (
        <StepReview
            data={state}
            isSubmitting={isSubmitting}
            onUpdate={update}
            onSubmit={handleSubmit}
            onBack={() => goToStep('denominations')}
        />
      )}
    </div>
  );
}
