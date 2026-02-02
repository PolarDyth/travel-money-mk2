/**
 * Customer queries for the currency exchange POS system
 *
 * This module provides server-side data fetching functions for customer management,
 * including CRUD operations, searching, and risk assessment.
 *
 * @module lib/queries/customers
 */

import { createClient } from "@/utils/supabase/server"
import type {
  Customer,
  CustomerRiskFactor,
  CustomerRiskFactorInsert,
  CustomerRelationship,
  CustomerRelationshipInsert,
} from "@/types"
import type { ActionResult } from "@/lib/types/response"
import {
  CustomerNotFoundError,
  CustomerAlreadyExistsError,
  formatSupabaseError,
} from "@/lib/errors"

/**
 * Get a customer by ID with decrypted PII
 *
 * @param customerId - The customer UUID
 * @returns The customer with decrypted PII
 */
export async function getCustomerById(
  customerId: string
): Promise<ActionResult<Customer & { decrypted_pii: { [key: string]: string } }>> {
  try {
    const supabase = await createClient()

    // Get the raw customer record
    const { data: customer, error } = await supabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .single()

    if (error) {
      return { success: false, error: formatSupabaseError(error) }
    }

    if (!customer) {
      throw new CustomerNotFoundError(customerId)
    }

    // Get decrypted PII using the SQL function
    const { data: decrypted, error: decryptError } = await supabase.rpc(
      "get_customer_with_decrypted_data",
      { customer_id: customerId }
    )

    if (decryptError) {
      return { success: false, error: formatSupabaseError(decryptError) }
    }

    const decryptedData = Array.isArray(decrypted) ? decrypted[0] : decrypted

    return {
      success: true,
      data: {
        ...customer,
        decrypted_pii: {
          first_name: decryptedData.first_name,
          last_name: decryptedData.last_name,
          date_of_birth: decryptedData.date_of_birth,
          address: decryptedData.address,
          phone: decryptedData.phone,
          email: decryptedData.email,
          id_type: decryptedData.id_type,
          id_number: decryptedData.id_number,
        },
      },
    }
  } catch (error) {
    if (error instanceof CustomerNotFoundError) {
      return { success: false, error: error.toAppError() }
    }
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
        userMessage: "Failed to fetch customer",
      },
    }
  }
}

/**
 * Get a customer by ID number (encrypted search)
 *
 * @param idNumber - The encrypted ID number to search for
 * @param branchId - The branch ID to scope the search
 * @returns The customer if found
 */
export async function getCustomerByIdNumber(
  idNumber: string,
  branchId: string
): Promise<ActionResult<Customer>> {
  try {
    const supabase = await createClient()

    // First encrypt the ID number for comparison
    const { data: encryptedId, error: encryptError } = await supabase.rpc("encrypt_pii", {
      plaintext: idNumber,
    })

    if (encryptError) {
      return { success: false, error: formatSupabaseError(encryptError) }
    }

    // Search for customer with matching encrypted ID number
    const { data: customer, error } = await supabase
      .from("customers")
      .select("*")
      .eq("id_number_bytea", encryptedId)
      .eq("branch_id", branchId)
      .maybeSingle()

    if (error) {
      return { success: false, error: formatSupabaseError(error) }
    }

    if (!customer) {
      throw new CustomerNotFoundError(idNumber)
    }

    return { success: true, data: customer }
  } catch (error) {
    if (error instanceof CustomerNotFoundError) {
      return { success: false, error: error.toAppError() }
    }
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
        userMessage: "Failed to fetch customer by ID",
      },
    }
  }
}

/**
 * Search customers by name (supports partial matching)
 *
 * @param searchTerm - The search term
 * @param branchId - Optional branch ID to filter by
 * @param limit - Maximum number of results (default: 20)
 * @returns List of matching customers with decrypted names
 */
export async function searchCustomersByName(
  searchTerm: string,
  branchId?: string,
  limit: number = 20
): Promise<ActionResult<Array<Customer & { decrypted_name: string }>>> {
  try {
    const supabase = await createClient()

    const { data: results, error } = await supabase.rpc("search_customers_by_name", {
      search_term: searchTerm,
      search_branch_id: branchId ?? undefined,
    })

    if (error) {
      return { success: false, error: formatSupabaseError(error) }
    }

    if (!results || !Array.isArray(results)) {
      return { success: true, data: [] }
    }

    // Limit results and combine with full customer records
    const limitedResults = results.slice(0, limit)
    const customerIds = limitedResults.map((r) => r.id)

    if (customerIds.length === 0) {
      return { success: true, data: [] }
    }

    const { data: customers, error: fetchError } = await supabase
      .from("customers")
      .select("*")
      .in("id", customerIds)

    if (fetchError) {
      return { success: false, error: formatSupabaseError(fetchError) }
    }

    // Combine results
    const combined = customers.map((customer) => {
      const searchResult = limitedResults.find((r) => r.id === customer.id)
      return {
        ...customer,
        decrypted_name: searchResult
          ? `${searchResult.first_name} ${searchResult.last_name}`
          : "",
      }
    })

    return { success: true, data: combined }
  } catch (error) {
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
        userMessage: "Failed to search customers",
      },
    }
  }
}

/**
 * List all customers for a branch
 *
 * @param branchId - The branch ID
 * @param filters - Optional filters (risk level, watchlist status)
 * @param pagination - Pagination options (page, pageSize)
 * @returns Paginated list of customers
 */
export async function listCustomers(
  branchId: string,
  filters?: {
    riskLevel?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
    isOnWatchlist?: boolean
    minTransactionCount?: number
  },
  pagination?: {
    page: number
    pageSize: number
  }
): Promise<ActionResult<{
    customers: Array<Customer & { decrypted_name: string }>
    total: number
    page: number
    pageSize: number
  }>> {
  try {
    const supabase = await createClient()
    const page = pagination?.page || 1
    const pageSize = pagination?.pageSize || 50
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // Build query
    let query = supabase
      .from("customers")
      .select("*", { count: "exact" })
      .eq("branch_id", branchId)
      .order("last_seen_at", { ascending: false })

    // Apply filters
    if (filters?.riskLevel) {
      query = query.eq("risk_level", filters.riskLevel)
    }
    if (filters?.isOnWatchlist !== undefined) {
      query = query.eq("is_on_watchlist", filters.isOnWatchlist)
    }
    if (filters?.minTransactionCount) {
      query = query.gte("transaction_count", filters.minTransactionCount)
    }

    // Apply pagination
    query = query.range(from, to)

    const { data: customers, error, count } = await query

    if (error) {
      return { success: false, error: formatSupabaseError(error) }
    }

    // Get decrypted names
    const customerIds = customers.map((c) => c.id)
    let customersWithNames: Array<Customer & { decrypted_name: string }> = []

    if (customerIds.length > 0) {
      const namesPromises = customers.map(async (customer) => {
        const { data: decrypted } = await supabase.rpc(
          "get_customer_with_decrypted_data",
          { customer_id: customer.id }
        )
        const decryptedData = Array.isArray(decrypted) ? decrypted[0] : decrypted
        return {
          ...customer,
          decrypted_name: decryptedData
            ? `${decryptedData.first_name} ${decryptedData.last_name}`
            : "",
        }
      })

      customersWithNames = await Promise.all(namesPromises)
    }

    return {
      success: true,
      data: {
        customers: customersWithNames,
        total: count || 0,
        page,
        pageSize,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
        userMessage: "Failed to list customers",
      },
    }
  }
}

/**
 * Create a new customer with encrypted PII
 *
 * @param customerData - The customer data to insert (plaintext PII)
 * @param branchId - The branch ID
 * @returns The created customer
 */
export async function createCustomer(
  customerData: {
    first_name: string
    last_name: string
    date_of_birth?: string
    address?: string
    phone: string
    email?: string
    id_type?: string
    id_number: string
  },
  branchId: string
): Promise<ActionResult<Customer>> {
  try {
    const supabase = await createClient()

    // Encrypt PII fields - extract data from RPC responses
    const [
      { data: first_name_bytea },
      { data: last_name_bytea },
      { data: id_number_bytea },
      { data: phone_bytea },
    ] = await Promise.all([
      supabase.rpc("encrypt_pii", { plaintext: customerData.first_name }),
      supabase.rpc("encrypt_pii", { plaintext: customerData.last_name }),
      supabase.rpc("encrypt_pii", { plaintext: customerData.id_number }),
      supabase.rpc("encrypt_pii", { plaintext: customerData.phone }),
    ])

    const [
      { data: date_of_birth_bytea },
      { data: address_bytea },
      { data: email_bytea },
      { data: id_type_bytea },
    ] = await Promise.all([
      customerData.date_of_birth
        ? supabase.rpc("encrypt_pii", { plaintext: customerData.date_of_birth })
        : { data: null, error: null },
      customerData.address
        ? supabase.rpc("encrypt_pii", { plaintext: customerData.address })
        : { data: null, error: null },
      customerData.email
        ? supabase.rpc("encrypt_pii", { plaintext: customerData.email })
        : { data: null, error: null },
      customerData.id_type
        ? supabase.rpc("encrypt_pii", { plaintext: customerData.id_type })
        : { data: null, error: null },
    ])

    // Validate encryption succeeded for required fields
    if (!first_name_bytea || !last_name_bytea || !id_number_bytea || !phone_bytea) {
      return {
        success: false,
        error: {
          code: "ENCRYPTION_FAILED",
          message: "Failed to encrypt required customer data",
          userMessage: "Failed to create customer due to encryption error",
        },
      }
    }

    // Check for existing customer with same ID (only if a real ID is provided, not a placeholder)
    // The caller is responsible for finding existing customers by name/postcode before creating
    if (customerData.id_number && customerData.id_number !== 'N/A' && customerData.id_number.trim() !== '') {
      const existingCheck = await getCustomerByIdNumber(
        customerData.id_number,
        branchId
      )

      if (existingCheck.success && existingCheck.data) {
        throw new CustomerAlreadyExistsError(customerData.id_number)
      }
    }

    // Insert customer
    const { data: customer, error } = await supabase
      .from("customers")
      .insert({
        first_name_bytea,
        last_name_bytea,
        id_number_bytea,
        phone_bytea,
        date_of_birth_bytea,
        address_bytea,
        email_bytea,
        id_type_bytea,
        branch_id: branchId,
        risk_score: 0,
        risk_level: "LOW",
        is_on_watchlist: false,
        transaction_count: 0,
        total_gbp_volume: 0,
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: formatSupabaseError(error) }
    }

    return { success: true, data: customer }
  } catch (error) {
    if (error instanceof CustomerAlreadyExistsError) {
      return { success: false, error: error.toAppError() }
    }
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
        userMessage: "Failed to create customer",
      },
    }
  }
}

/**
 * Update customer risk score and level
 *
 * @param customerId - The customer ID
 * @param riskScore - New risk score (0-100)
 * @returns Updated customer
 */
export async function updateCustomerRisk(
  customerId: string,
  riskScore: number
): Promise<ActionResult<{ risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" }>> {
  try {
    const supabase = await createClient()

    // Determine risk level from score
    const riskLevel =
      riskScore >= 75 ? "CRITICAL" : riskScore >= 50 ? "HIGH" : riskScore >= 25 ? "MEDIUM" : "LOW"

    const { data, error } = await supabase
      .from("customers")
      .update({ risk_score: riskScore, risk_level: riskLevel })
      .eq("id", customerId)
      .select("risk_level")
      .single()

    if (error) {
      return { success: false, error: formatSupabaseError(error) }
    }

    return { success: true, data: { risk_level: data.risk_level } }
  } catch (error) {
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
        userMessage: "Failed to update customer risk",
      },
    }
  }
}

/**
 * Add a customer to the watchlist
 *
 * @param customerId - The customer ID
 * @param reason - The reason for being added to watchlist
 * @returns Updated customer
 */
export async function addToWatchlist(
  customerId: string,
  reason: string
): Promise<ActionResult<Customer>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("customers")
      .update({
        is_on_watchlist: true,
        watchlist_reason: reason,
        risk_score: 100, // Maximum risk
        risk_level: "CRITICAL",
      })
      .eq("id", customerId)
      .select()
      .single()

    if (error) {
      return { success: false, error: formatSupabaseError(error) }
    }

    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
        userMessage: "Failed to add customer to watchlist",
      },
    }
  }
}

/**
 * Get customer risk factors
 *
 * @param customerId - The customer ID
 * @param activeOnly - Only return active (non-expired) factors
 * @returns List of risk factors
 */
export async function getCustomerRiskFactors(
  customerId: string,
  activeOnly: boolean = true
): Promise<ActionResult<CustomerRiskFactor[]>> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from("customer_risk_factors")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })

    if (activeOnly) {
      query = query.or("expires_at.is.null,expires_at.gt.now()")
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: formatSupabaseError(error) }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
        userMessage: "Failed to fetch risk factors",
      },
    }
  }
}

/**
 * Add a risk factor to a customer
 *
 * @param factor - The risk factor to add
 * @returns Created risk factor
 */
export async function addCustomerRiskFactor(
  factor: CustomerRiskFactorInsert
): Promise<ActionResult<CustomerRiskFactor>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("customer_risk_factors")
      .insert(factor)
      .select()
      .single()

    if (error) {
      return { success: false, error: formatSupabaseError(error) }
    }

    // Update customer risk score
    const { data: customerFactors } = await getCustomerRiskFactors(factor.customer_id, true)

    if (customerFactors) {
      const newScore = customerFactors.reduce((sum, f) => sum + f.score_impact, 0)
      await updateCustomerRisk(factor.customer_id, Math.min(newScore, 100))
    }

    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
        userMessage: "Failed to add risk factor",
      },
    }
  }
}

/**
 * Get customer relationships
 *
 * @param customerId - The customer ID
 * @returns List of customer relationships
 */
export async function getCustomerRelationships(
  customerId: string
): Promise<ActionResult<CustomerRelationship[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("customer_relationships")
      .select("*")
      .or(`customer_a_id.eq.${customerId},customer_b_id.eq.${customerId}`)
      .order("confidence_score", { ascending: false })

    if (error) {
      return { success: false, error: formatSupabaseError(error) }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
        userMessage: "Failed to fetch customer relationships",
      },
    }
  }
}

/**
 * Create a customer relationship
 *
 * @param relationship - The relationship to create
 * @returns Created relationship
 */
export async function createCustomerRelationship(
  relationship: CustomerRelationshipInsert
): Promise<ActionResult<CustomerRelationship>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("customer_relationships")
      .insert(relationship)
      .select()
      .single()

    if (error) {
      return { success: false, error: formatSupabaseError(error) }
    }

    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
        userMessage: "Failed to create customer relationship",
      },
    }
  }
}

/**
 * Get high-risk customers for a branch
 *
 * @param branchId - The branch ID
 * @param limit - Maximum number of results
 * @returns List of high-risk customers
 */
export async function getHighRiskCustomers(
  branchId: string,
  limit: number = 50
): Promise<ActionResult<Array<Customer & { decrypted_name: string }>>> {
  try {
    const supabase = await createClient()

    const { data: customers, error } = await supabase
      .from("customers")
      .select("*")
      .eq("branch_id", branchId)
      .or("risk_level.in.(HIGH,CRITICAL),is_on_watchlist.eq.true")
      .order("risk_score", { ascending: false })
      .limit(limit)

    if (error) {
      return { success: false, error: formatSupabaseError(error) }
    }

    // Get decrypted names
    const customerIds = customers.map((c) => c.id)
    let customersWithNames: Array<Customer & { decrypted_name: string }> = []

    if (customerIds.length > 0) {
      const namesPromises = customers.map(async (customer) => {
        const { data: decrypted } = await supabase.rpc(
          "get_customer_with_decrypted_data",
          { customer_id: customer.id }
        )
        const decryptedData = Array.isArray(decrypted) ? decrypted[0] : decrypted
        return {
          ...customer,
          decrypted_name: decryptedData
            ? `${decryptedData.first_name} ${decryptedData.last_name}`
            : "",
        }
      })

      customersWithNames = await Promise.all(namesPromises)
    }

    return { success: true, data: customersWithNames }
  } catch (error) {
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
        userMessage: "Failed to fetch high-risk customers",
      },
    }
  }
}
