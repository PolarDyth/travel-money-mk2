'use server'

import { createClient } from "@/utils/supabase/server"
import { Database } from "@/types/database"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export type TransactionDraft = {
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
  denominations: Array<{
    denomination_id: string;
    count: number;
  }>;
}

// Helper types imported in update
import { Currency, ExchangeRate, Denomination } from "./types";

export async function submitTransaction(draft: TransactionDraft) {
  const supabase = await createClient()

  
  // 1. Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  // 2. Get active staff profile with branch details
  const { data: staff, error: staffError } = await supabase
    .from('staff_profiles')
    .select('id, branch_id, branches(code)')
    .eq('id', user.id)
    .single()

  if (staffError || !staff) {
    return { error: 'Staff profile not found' }
  }

  const branchCode = staff.branches && !Array.isArray(staff.branches) ? staff.branches.code : 'UNKNOWN';


  // 3. Get active drawer session
  const { data: session, error: sessionError } = await supabase
    .from('drawer_sessions')
    .select('id')
    .eq('operator_id', staff.id)
    .eq('status', 'open')
    .single()

  if (sessionError || !session) {
    return { error: 'No active drawer session found. Please open a till first.' }
  }

  const referenceDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const referenceRandom = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const referenceNumber = `TXN-${branchCode}-${referenceDate}-${referenceRandom}`;

  const { data: transaction, error: txnError } = await supabase
    .from('transactions')
    .insert({
      branch_id: staff.branch_id,
      operator_id: staff.id,
      drawer_session_id: session.id,
      transaction_type: draft.type,
      foreign_currency_code: draft.currency_code,
      foreign_amount: draft.foreign_amount,
      base_amount: draft.base_amount, // Assuming local_amount is the GBP column
      base_currency_code: 'GBP',
      rate_used: draft.exchange_rate,
      status: 'completed',
      reference_number: referenceNumber,
      customer_name: draft.customer ? `${draft.customer.first_name || ''} ${draft.customer.last_name || ''}`.trim() : null,
      // customer_address: draft.customer?.address_line_1, // Simplified mapping
      // Add other compliant fields if columns exist
    })
    .select()
    .single()


  if (txnError) {
    console.error('Transaction Error:', txnError)
    return { error: 'Failed to record transaction' }
  }
  
  revalidatePath('/operator')
  return { success: true, transactionId: transaction.id }
}

export async function getCurrencies(): Promise<Currency[]> {
    const supabase = await createClient()
    const { data } = await supabase
        .from('currencies')
        .select('*')
        .eq('is_active', true)
        .order('code')
    
    return data || []
}

export async function getDailyRates(): Promise<ExchangeRate[]> {
    const supabase = await createClient()
    // In a real app we'd fetch the latest rate for today.
    // For now fetching the latest configured rates.
    const { data } = await supabase
        .from('exchange_rates')
        .select('*')
    // We would refine this query to match the business logic (latest per currency)
    return data || []
}

export async function getDenominations(currencyCode: string): Promise<Denomination[]> {
    const supabase = await createClient()
    const { data } = await supabase
        .from('currency_denominations')
        .select('*')
        .eq('currency_code', currencyCode)
        .eq('is_active', true)
        .order('value', { ascending: false })
    
    return data || []
}
