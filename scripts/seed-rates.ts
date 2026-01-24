
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$', decimal_places: 2 },
  { code: 'EUR', name: 'Euro', symbol: '€', decimal_places: 2 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimal_places: 0 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimal_places: 2 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimal_places: 2 },
  { code: 'CDF', name: 'Congolese Franc', symbol: 'FC', decimal_places: 2 },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr', decimal_places: 2 },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', decimal_places: 2 },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', decimal_places: 2 },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', decimal_places: 2 },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimal_places: 2 },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimal_places: 2 },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', decimal_places: 2 },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', decimal_places: 2 },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', decimal_places: 2 },
]

// 2.5% spread
const SELL_SPREAD = 0.975
const BUY_SPREAD = 1.025

async function fetchFrankfurterRates(date?: string) {
  const url = `https://api.frankfurter.app/${date || 'latest'}?from=GBP`
  console.log(`Fetching rates from ${url}...`)
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch rates: ${res.statusText}`)
  }
  return res.json()
}

async function seed() {
  console.log('Starting seed process...')

  // 1. Seed Currencies
  console.log('Seeding currencies...')
  for (const currency of CURRENCIES) {
    const { error } = await supabase
      .from('currencies')
      .upsert({
        code: currency.code,
        name: currency.name,
        symbol: currency.symbol,
        decimal_places: currency.decimal_places,
        is_active: true,
        is_base_currency: false,
        min_transaction_amount: 10,
        max_transaction_amount: 5000,
        requires_id_threshold: 1000
      }, { onConflict: 'code' })

    if (error) {
      console.error(`Error seeding currency ${currency.code}:`, error)
    }
  }

  // 2. Fetch Latest Rates
  const latestData = await fetchFrankfurterRates()
  const rates = latestData.rates

  console.log('Seeding current exchange rates...')
  
  const rateIds: Record<string, string> = {}

  for (const currency of CURRENCIES) {
    const rate = rates[currency.code]
    if (!rate) {
      console.warn(`No rate found for ${currency.code}`)
      continue
    }
    
    // Apply spread
    // Buy Rate (Lower): We pay less GBP for the foreign currency
    const buyRate = rate * BUY_SPREAD
    
    // Sell Rate (Higher): We charge more GBP for the foreign currency
    const sellRate = rate * SELL_SPREAD

    // Upsert exchange rate
    // Assuming 'branch_id' is null for global rates.
    // We need to find the ID if it exists or create new.
    
    // Check if exists
    const { data: existingRates } = await supabase
      .from('exchange_rates')
      .select('id')
      .eq('currency_code', currency.code)
      .is('branch_id', null)
      .single()

    const payload = {
      currency_code: currency.code,
      buy_rate: buyRate,
      sell_rate: sellRate,
      source: 'feed',
      effective_from: new Date().toISOString(),
      branch_id: null, // Global rate
      spread_percentage: 2.5
    }

    let rateId = existingRates?.id

    if (rateId) {
      const { error } = await supabase
        .from('exchange_rates')
        .update(payload)
        .eq('id', rateId)
      
      if (error) console.error(`Error updating rate for ${currency.code}:`, error)
    } else {
      const { data, error } = await supabase
        .from('exchange_rates')
        .insert(payload)
        .select('id')
        .single()
      
      if (error) {
        console.error(`Error inserting rate for ${currency.code}:`, error)
      } else {
        rateId = data.id
      }
    }

    if (rateId) {
      rateIds[currency.code] = rateId
    }
  }

  // 3. Seed History (last 7 days)
  console.log('Seeding rate history...')
  const dates = []
  for (let i = 1; i <= 7; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(d.toISOString().split('T')[0])
  }

  for (const date of dates) {
    // Check if we already have history for this date? 
    // Usually history is just a log. We can just insert.
    // But to avoid duplicates on re-runs, maybe skip?
    // Let's just insert.
    
    try {
      const histData = await fetchFrankfurterRates(date)
      const histRates = histData.rates

      const historyInserts = []

      for (const currency of CURRENCIES) {
        const rate = histRates[currency.code]
        if (!rate || !rateIds[currency.code]) continue

        const baseRate = 1 / rate
        const buyRate = baseRate * BUY_SPREAD
        const sellRate = baseRate * SELL_SPREAD

        historyInserts.push({
          rate_id: rateIds[currency.code],
          currency_code: currency.code,
          buy_rate: buyRate, 
          sell_rate: sellRate,
          source: 'feed',
          effective_from: new Date(date).toISOString(), // rough time
          effective_until: new Date(date).toISOString(), // History items usually have ranges, but this is a log.
           // Schema check for exchange_rate_history:
           // action, branch_id, buy_rate, currency_code, effective_from, effective_until, id, rate_id, recorded_at, sell_rate, set_by, source
           action: 'UPDATE',
           recorded_at: new Date(date).toISOString(),
           branch_id: null
        })
      }

      if (historyInserts.length > 0) {
        const { error } = await supabase
          .from('exchange_rate_history')
          .insert(historyInserts)
        
        if (error) console.error(`Error inserting history for ${date}:`, error)
        else console.log(`Inserted history for ${date}`)
      }

    } catch (e) {
      console.error(`Failed to seed history for ${date}:`, e)
    }
    
    // rate limit kindness
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  console.log('Seeding complete.')
}

seed().catch(console.error)
