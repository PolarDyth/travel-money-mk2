import { useState, useCallback } from 'react';
import { TransactionDraft } from '@/app/operator/transaction/actions';

export type WizardStep = 'currency' | 'customer' | 'denominations' | 'review' | 'success';

interface TransactionState extends TransactionDraft {
  step: WizardStep;
}

const INITIAL_STATE: TransactionState = {
  step: 'currency',
  type: 'sell', // Default
  currency_code: '',
  foreign_amount: 0,
  base_amount: 0,
  exchange_rate: 0,
  payment_method: 'card', 
  denominations: [],
};

export function useTransaction() {
  const [state, setState] = useState<TransactionState>(INITIAL_STATE);

  const setPartialState = useCallback((updates: Partial<TransactionState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const goToStep = useCallback((step: WizardStep) => {
    setState(prev => ({ ...prev, step }));
  }, []);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    state,
    update: setPartialState,
    goToStep,
    reset
  };
}
