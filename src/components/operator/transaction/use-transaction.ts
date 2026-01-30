import { useState, useCallback, useEffect, useRef, useTransition } from 'react';

export type WizardStep = 'currency' | 'customer' | 'denominations' | 'review' | 'success';

export interface TransactionState {
  step: WizardStep;
  type: 'buy' | 'sell';
  currency_code: string;
  foreign_amount: number;
  base_amount: number;
  exchange_rate: number;
  rate_id?: string;
  customer?: {
    first_name?: string;
    last_name?: string;
    address_line_1?: string;
    city?: string;
    postcode?: string;
    id_type?: string;
    id_reference?: string;
  };
  payment_method?: 'cash' | 'card';
  denominations: Array<{ denomination_id: string; count: number }>;
  rate_override?: {
    original_rate: number;
    override_rate: number;
    reason: string;
    acknowledged: boolean;
    has_manager_approval?: boolean;
  };
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

const DRAFT_STORAGE_KEY = 'transaction_draft';

export function useTransaction() {
  const [state, setState] = useState<TransactionState>(INITIAL_STATE);
  const [hasDraft, setHasDraft] = useState(false);
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const [, startTransition] = useTransition();
  const isRestoringRef = useRef(false);
  const isInitializedRef = useRef(false);

  // Check for draft on mount
  useEffect(() => {
    try {
      const savedDraft = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        const draft = JSON.parse(savedDraft) as TransactionState;
        // Only restore if it has meaningful data (not just initial state)
        if (draft.currency_code && draft.foreign_amount > 0) {
          startTransition(() => {
            setHasDraft(true);
            setShowDraftPrompt(true);
          });
          console.log('[draft-check] Found valid draft on mount');
        }
      }
    } catch {
      // Invalid JSON, ignore
    }
    isInitializedRef.current = true;
  }, []);

  // Auto-save to sessionStorage when state changes
  useEffect(() => {
    // Skip auto-save logic during restoration or on initial mount
    if (!isInitializedRef.current) {
      console.log('[auto-save] Skipping (not initialized yet)');
      return;
    }

    // Skip auto-save logic during restoration
    if (isRestoringRef.current) {
      console.log('[auto-save] Skipping due to restoration flag');
      isRestoringRef.current = false;
      return;
    }

    // Skip if we're showing the draft prompt (don't modify the draft while user decides)
    if (showDraftPrompt) {
      console.log('[auto-save] Skipping (showing draft prompt)');
      return;
    }

    console.log('[auto-save] State changed:', { step: state.step, currency_code: state.currency_code, foreign_amount: state.foreign_amount });

    try {
      if (state.step === 'success') {
        // Clear draft on successful completion
        sessionStorage.removeItem(DRAFT_STORAGE_KEY);
        startTransition(() => {
          setHasDraft(false);
        });
        console.log('[auto-save] Draft cleared (success)');
      } else if (state.currency_code && state.foreign_amount > 0) {
        // Save if we have meaningful data (currency selected and amount entered)
        sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(state));
        startTransition(() => {
          setHasDraft(true);
        });
        console.log('[auto-save] Draft saved');
      }
      // Note: We NO LONGER auto-clear drafts when state is empty
      // Drafts persist until user explicitly discards them or transaction completes
    } catch {
      // SessionStorage unavailable, silently fail
    }
  }, [state, showDraftPrompt]);

  const setPartialState = useCallback((updates: Partial<TransactionState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const goToStep = useCallback((step: WizardStep) => {
    setState(prev => ({ ...prev, step }));
  }, []);

  const restoreDraft = useCallback(() => {
    try {
      const savedDraft = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      console.log('[restoreDraft] Found draft in sessionStorage:', savedDraft);
      if (savedDraft) {
        const parsedDraft = JSON.parse(savedDraft) as TransactionState;
        console.log('[restoreDraft] Parsed draft:', parsedDraft);
        isRestoringRef.current = true;
        setState(parsedDraft);
        setShowDraftPrompt(false);
        console.log('[restoreDraft] State set, closing dialog');
      }
    } catch (e) {
      console.error('[restoreDraft] Error:', e);
      // Invalid JSON, just reset
      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      setHasDraft(false);
      setShowDraftPrompt(false);
    }
  }, []);

  const discardDraft = useCallback(() => {
    sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    setHasDraft(false);
    setShowDraftPrompt(false);
    setState(INITIAL_STATE);
  }, []);

  const reset = useCallback(() => {
    sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    setHasDraft(false);
    setState(INITIAL_STATE);
  }, []);

  return {
    state,
    update: setPartialState,
    goToStep,
    reset,
    hasDraft,
    showDraftPrompt,
    restoreDraft,
    discardDraft,
  };
}
