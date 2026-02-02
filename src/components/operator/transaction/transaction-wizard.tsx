'use client';

import * as React from 'react';
import { useTransaction } from './use-transaction';
import { Stepper } from "@/components/ui/stepper";
import { StepCurrency } from './step-currency';
import { StepCustomer } from './step-customer';
import { StepDenominations } from './step-denominations';
import { StepReview } from './step-review';
import { StepSuccess } from './step-success';
import { RateOverrideDialog } from './rate-override-dialog';
import { submitTransaction } from '@/app/(dashboard)/operator/transaction/actions';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Currency, ExchangeRate, Denomination } from "@/app/(dashboard)/operator/transaction/types";
import { getErrorMessage } from '@/lib/types/response';
import { useUser } from "@/lib/hooks/use-user";
import type { TransactionDraft } from '@/app/(dashboard)/operator/transaction/schemas';

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
  const { state, update, goToStep, reset, hasDraft, showDraftPrompt, restoreDraft, discardDraft } = useTransaction();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [createdTxnId, setCreatedTxnId] = React.useState<string>();
  const [rateOverrideDialogOpen, setRateOverrideDialogOpen] = React.useState(false);
  const { user } = useUser();

  // Debug logging to track state changes
  React.useEffect(() => {
    console.log('[TransactionWizard] Current state:', {
      step: state.step,
      currency_code: state.currency_code,
      foreign_amount: state.foreign_amount,
      base_amount: state.base_amount,
      type: state.type,
    });
  }, [state]);

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
      // Prepare submission data including rate override if present
      const submissionData: TransactionDraft = {
        ...state,
        exchange_rate: state.rate_override?.override_rate || state.exchange_rate,
      } as TransactionDraft;

      // Add rate_override if present
      if (state.rate_override) {
        submissionData.rate_override = {
          original_rate: state.rate_override.original_rate,
          override_rate: state.rate_override.override_rate,
          reason: state.rate_override.reason,
          acknowledged: state.rate_override.acknowledged,
        };

        // If supervisor needs manager approval, include that
        if (state.rate_override.has_manager_approval) {
          submissionData.rate_override.has_manager_approval = true;
        }
      }

      const result = await submitTransaction(submissionData);
      if (result.error) {
        setError(getErrorMessage(result.error));
      } else {
        setCreatedTxnId(result.data?.transactionId);
        goToStep('success');
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDraftDecision = (restore: boolean) => {
    console.log('[handleDraftDecision] User clicked:', restore ? 'RESUME' : 'DISCARD');
    console.log('[handleDraftDecision] sessionStorage before:', sessionStorage.getItem('transaction_draft'));
    if (restore) {
      restoreDraft();
    } else {
      discardDraft();
    }
    console.log('[handleDraftDecision] sessionStorage after:', sessionStorage.getItem('transaction_draft'));
  };

  const handleRateOverrideConfirm = (overrideRate: number, reason: string, hasManagerApproval: boolean, acknowledged: boolean) => {
    update({
      rate_override: {
        original_rate: currentRate,
        override_rate: overrideRate,
        reason: reason,
        acknowledged: acknowledged,
        has_manager_approval: hasManagerApproval,
      },
      exchange_rate: overrideRate, // Use override rate for calculations
    });
    setRateOverrideDialogOpen(false);
  };

  const handleRateOverrideCancel = () => {
    setRateOverrideDialogOpen(false);
    // Reset override state
    update({
      rate_override: undefined,
      exchange_rate: currentRate, // Reset to original rate
    });
  };

  const currentStepIndex = STEPS.findIndex(s => {
    // Map WizardStep string to index
    if (state.step === 'currency') return s.title === 'Currency';
    if (state.step === 'customer') return s.title === 'Customer';
    if (state.step === 'denominations') return s.title === 'Cash';
    if (state.step === 'review') return s.title === 'Review';
    return false;
  });

  // Check if user can override rates (supervisor or higher)
  const canOverrideRate = user && ['supervisor', 'manager', 'admin'].includes(user.role) || undefined;

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

      {/* Draft Restoration Dialog */}
      <Dialog open={showDraftPrompt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Resume Previous Transaction?
            </DialogTitle>
            <DialogDescription>
              You have an incomplete transaction from earlier. Would you like to continue where you left off, or start fresh?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="outline" onClick={() => handleDraftDecision(false)}>
                Start Fresh
              </Button>
            </DialogClose>
            <DialogClose asChild>
              <Button onClick={() => handleDraftDecision(true)}>
                Resume Transaction
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
          userRole={user?.role}
          branchId={user?.branch_id}
          canOverrideRate={canOverrideRate}
          onRateOverrideClick={() => setRateOverrideDialogOpen(true)}
          rateOverride={state.rate_override ? {
            originalRate: state.rate_override.original_rate,
            overrideRate: state.rate_override.override_rate,
          } : undefined}
          hasDraft={hasDraft}
          onDiscardDraft={discardDraft}
        />
      )}

      {state.step === 'customer' && (
        <StepCustomer
          baseAmount={state.base_amount}
          customer={state.customer}
          onUpdate={update}
          onNext={() => goToStep(activeDenoms.length > 0 ? 'denominations' : 'review')}
          onBack={() => goToStep('currency')}
          showDenominationsStep={activeDenoms.length > 0}
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

      {/* Rate Override Dialog */}
      {user && user.role && user.branch_id && (
        <RateOverrideDialog
          open={rateOverrideDialogOpen}
          onOpenChange={setRateOverrideDialogOpen}
          originalRate={currentRate}
          currencyCode={state.currency_code}
          branchId={user.branch_id}
          staffRole={user.role}
          onConfirm={handleRateOverrideConfirm}
          onCancel={handleRateOverrideCancel}
        />
      )}
    </div>
  );
}
