/**
 * Customer Migration Script
 *
 * This script backfills customer records from existing transaction data.
 * It processes historical transactions and creates customer records with
 * encrypted PII, then links them to transactions.
 *
 * Usage: npx tsx scripts/migrate-customers.ts [--branch-id <id>] [--dry-run]
 *
 * Options:
 *   --branch-id <id>  Only migrate transactions for a specific branch
 *   --dry-run         Show what would be migrated without making changes
 *   --batch-size <n>  Number of transactions to process per batch (default: 100)
 *
 * @module scripts/migrate-customers
 */

import { createClient } from '@/utils/supabase/server'
import { encryptCustomerPII, hashCustomerPII } from '@/lib/crypto/encryption'
import type { Transaction, Json } from '@/types'

interface MigrationOptions {
  branchId?: string
  dryRun: boolean
  batchSize: number
}

interface MigrationStats {
  transactionsProcessed: number
  customersCreated: number
  customersMatched: number
  transactionsUpdated: number
  errors: Array<{ transaction: string; error: string }>
}

/**
 * Normalize customer data from transaction
 */
function normalizeCustomerData(txn: Transaction): {
  first_name: string
  last_name: string
  date_of_birth: string | null
  address: string | null
  phone: string
  email: string | null
  id_type: string | null
  id_number: string
} | null {
  // Extract customer data from transaction details
  const details = txn.details as Json | undefined

  if (!details || typeof details !== 'object') {
    return null
  }

  const customerDetails = details as Record<string, unknown>

  // Customer data may be in different fields depending on transaction structure
  const customerData = {
    first_name: (customerDetails.customer_first_name as string) || (customerDetails.first_name as string) || '',
    last_name: (customerDetails.customer_last_name as string) || (customerDetails.last_name as string) || '',
    date_of_birth: (customerDetails.customer_date_of_birth as string) || (customerDetails.date_of_birth as string) || null,
    address: (customerDetails.customer_address as string) || (customerDetails.address as string) || null,
    phone: (customerDetails.customer_phone as string) || (customerDetails.phone as string) || '',
    email: (customerDetails.customer_email as string) || (customerDetails.email as string) || null,
    id_type: (customerDetails.customer_id_type as string) || (customerDetails.id_type as string) || null,
    id_number: (customerDetails.customer_id_number as string) || (customerDetails.id_number as string) || '',
  }

  // Validate required fields
  if (!customerData.first_name || !customerData.last_name || !customerData.phone || !customerData.id_number) {
    return null
  }

  return customerData
}

/**
 * Find existing customer by matching PII hash
 */
async function findExistingCustomer(
  supabase: Awaited<ReturnType<typeof createClient>>,
  customerData: ReturnType<typeof normalizeCustomerData>
): Promise<string | null> {
  if (!customerData) return null

  // Generate hash for matching
  const hash = await hashCustomerPII({
    first_name: customerData.first_name,
    last_name: customerData.last_name,
    date_of_birth: customerData.date_of_birth || undefined,
  })

  // Search for customer with matching pii_hash
  const { data } = await supabase
    .from('customers')
    .select('id')
    .eq('pii_hash', hash)
    .limit(1)

  if (data && data.length > 0) {
    return data[0].id
  }

  return null
}

/**
 * Create a new customer record with encrypted PII
 */
async function createCustomerRecord(
  supabase: Awaited<ReturnType<typeof createClient>>,
  txn: Transaction,
  customerData: ReturnType<typeof normalizeCustomerData>
): Promise<string | null> {
  if (!customerData) return null

  try {
    // Encrypt PII
    const encryptedData = await encryptCustomerPII(customerData)

    // Generate PII hash for matching
    const piiHash = await hashCustomerPII({
      first_name: customerData.first_name,
      last_name: customerData.last_name,
      date_of_birth: customerData.date_of_birth || undefined,
    })

    // Create customer record
    const { data, error } = await supabase
      .from('customers')
      .insert({
        branch_id: txn.branch_id,
        pii_hash: piiHash,
        first_name_bytea: encryptedData.first_name_bytea,
        last_name_bytea: encryptedData.last_name_bytea,
        date_of_birth_bytea: encryptedData.date_of_birth_bytea,
        address_bytea: encryptedData.address_bytea,
        phone_bytea: encryptedData.phone_bytea,
        email_bytea: encryptedData.email_bytea,
        id_type_bytea: encryptedData.id_type_bytea,
        id_number_bytea: encryptedData.id_number_bytea,
        risk_score: 0,
        risk_level: 'LOW',
        is_on_watchlist: false,
        first_seen_at: txn.created_at,
        last_seen_at: txn.created_at,
        transaction_count: 1,
        total_gbp_volume: txn.base_amount,
      })
      .select('id')
      .single()

    if (error) {
      console.error(`Failed to create customer for transaction ${txn.id}:`, error.message)
      return null
    }

    return data?.id || null
  } catch (error) {
    console.error(`Error creating customer for transaction ${txn.id}:`, error)
    return null
  }
}

/**
 * Update customer statistics after linking transaction
 */
async function updateCustomerStats(
  supabase: Awaited<ReturnType<typeof createClient>>,
  customerId: string,
  txn: Transaction
): Promise<void> {
  // Update last_seen_at, transaction_count, and total_gbp_volume
  await supabase.rpc('increment_customer_stats', {
    customer_id: customerId,
    transaction_amount: txn.base_amount,
    transaction_date: txn.created_at,
  })
}

/**
 * Migrate a single transaction
 */
async function migrateTransaction(
  supabase: Awaited<ReturnType<typeof createClient>>,
  txn: Transaction,
  options: MigrationOptions
): Promise<{ created: boolean; customerId: string | null; error?: string }> {
  try {
    // Normalize customer data from transaction
    const customerData = normalizeCustomerData(txn)

    if (!customerData) {
      return { created: false, customerId: null, error: 'No customer data in transaction' }
    }

    // Check if customer already exists
    const existingCustomerId = await findExistingCustomer(supabase, customerData)

    let customerId = existingCustomerId

    // Create new customer if not found
    if (!customerId) {
      if (options.dryRun) {
        console.log(`[DRY RUN] Would create customer for transaction ${txn.id}`)
        return { created: true, customerId: 'dry-run-id' }
      }

      customerId = await createCustomerRecord(supabase, txn, customerData)
    }

    if (!customerId) {
      return { created: false, customerId: null, error: 'Failed to create or find customer' }
    }

    // Link transaction to customer
    if (!options.dryRun) {
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ customer_id: customerId })
        .eq('id', txn.id)

      if (updateError) {
        return { created: false, customerId: null, error: updateError.message }
      }

      // Update customer statistics
      await updateCustomerStats(supabase, customerId, txn)
    }

    return {
      created: !existingCustomerId,
      customerId,
    }
  } catch (error) {
    return {
      created: false,
      customerId: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Main migration function
 */
export async function migrateCustomers(options: MigrationOptions = {
  dryRun: false,
  batchSize: 100,
}): Promise<MigrationStats> {
  const stats: MigrationStats = {
    transactionsProcessed: 0,
    customersCreated: 0,
    customersMatched: 0,
    transactionsUpdated: 0,
    errors: [],
  }

  try {
    const supabase = await createClient()

    console.log(`Starting customer migration...`)
    if (options.dryRun) {
      console.log(`[DRY RUN] No changes will be made`)
    }
    if (options.branchId) {
      console.log(`Filtering by branch: ${options.branchId}`)
    }

    // Fetch transactions without customer_id
    let query = supabase
      .from('transactions')
      .select('*')
      .is('customer_id', null)
      .order('created_at', { ascending: true })

    if (options.branchId) {
      query = query.eq('branch_id', options.branchId)
    }

    const { data: transactions, error } = await query

    if (error) {
      throw new Error(`Failed to fetch transactions: ${error.message}`)
    }

    if (!transactions || transactions.length === 0) {
      console.log('No transactions to migrate')
      return stats
    }

    console.log(`Found ${transactions.length} transactions to process`)

    // Process in batches
    for (let i = 0; i < transactions.length; i += options.batchSize) {
      const batch = transactions.slice(i, i + options.batchSize)
      console.log(`\nProcessing batch ${Math.floor(i / options.batchSize) + 1}/${Math.ceil(transactions.length / options.batchSize)}`)

      for (const txn of batch as Transaction[]) {
        stats.transactionsProcessed++

        const result = await migrateTransaction(supabase, txn as Transaction, options)

        if (result.error) {
          stats.errors.push({ transaction: txn.id, error: result.error })
          console.error(`  ✗ Transaction ${txn.id}: ${result.error}`)
        } else if (result.created) {
          stats.customersCreated++
          stats.transactionsUpdated++
          console.log(`  ✓ Transaction ${txn.id}: Created customer ${result.customerId}`)
        } else {
          stats.customersMatched++
          stats.transactionsUpdated++
          console.log(`  ✓ Transaction ${txn.id}: Matched existing customer ${result.customerId}`)
        }
      }
    }

    return stats
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  }
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2)

  const options: MigrationOptions = {
    dryRun: false,
    batchSize: 100,
  }

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--branch-id':
        options.branchId = args[++i]
        break
      case '--dry-run':
        options.dryRun = true
        break
      case '--batch-size':
        options.batchSize = parseInt(args[++i], 10)
        break
      case '--help':
        console.log(`
Customer Migration Script

Usage: npx tsx scripts/migrate-customers.ts [options]

Options:
  --branch-id <id>  Only migrate transactions for a specific branch
  --dry-run         Show what would be migrated without making changes
  --batch-size <n>  Number of transactions to process per batch (default: 100)
  --help            Show this help message

Examples:
  npx tsx scripts/migrate-customers.ts
  npx tsx scripts/migrate-customers.ts --dry-run
  npx tsx scripts/migrate-customers.ts --branch-id branch-123
        `)
        process.exit(0)
    }
  }

  const startTime = Date.now()

  try {
    const stats = await migrateCustomers(options)

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    console.log(`\n${'='.repeat(50)}`)
    console.log('Migration Complete')
    console.log(`${'='.repeat(50)}`)
    console.log(`Duration: ${duration}s`)
    console.log(`Transactions processed: ${stats.transactionsProcessed}`)
    console.log(`Customers created: ${stats.customersCreated}`)
    console.log(`Customers matched: ${stats.customersMatched}`)
    console.log(`Transactions updated: ${stats.transactionsUpdated}`)
    console.log(`Errors: ${stats.errors.length}`)

    if (stats.errors.length > 0) {
      console.log(`\nErrors:`)
      stats.errors.forEach(({ transaction, error }) => {
        console.log(`  - ${transaction}: ${error}`)
      })
    }

    process.exit(stats.errors.length > 0 ? 1 : 0)
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}
