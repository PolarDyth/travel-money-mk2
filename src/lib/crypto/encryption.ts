/**
 * Encryption utilities for customer PII (Personally Identifiable Information)
 *
 * This module provides functions for encrypting and decrypting sensitive customer data
 * using AES-256 encryption via PostgreSQL's pgcrypto extension.
 *
 * The encryption key should be set via the `NEXT_PUBLIC_ENCRYPTION_KEY` environment variable
 * and passed to PostgreSQL via the `app.encryption_key` configuration parameter.
 *
 * @module lib/crypto/encryption
 */

import { createClient } from "@/utils/supabase/server"
import { EncryptionFailedError, DecryptionFailedError } from "@/lib/errors"
import { createHash } from "node:crypto"

/**
 * Encryption result containing both encrypted data for storage
 * and a flag indicating if encryption was performed
 */
export interface EncryptedData {
  encrypted: boolean
  data: string | null
}

/**
 * Customer PII data that can be encrypted/decrypted
 */
export interface CustomerPII {
  first_name: string
  last_name: string
  date_of_birth?: string | null
  address?: string | null
  phone: string
  email?: string | null
  id_type?: string | null
  id_number: string
}

/**
 * Encrypt a plaintext value using pgcrypto
 *
 * @param plaintext - The text to encrypt
 * @returns Base64-encoded encrypted data
 * @throws EncryptionFailedError if encryption fails
 */
export async function encryptPII(plaintext: string): Promise<string> {
  if (!plaintext || plaintext.trim() === "") {
    throw new EncryptionFailedError("Cannot encrypt empty string")
  }

  try {
    const supabase = await createClient()

    // Call the encrypt_pii SQL function
    const { data, error } = await supabase.rpc("encrypt_pii", {
      plaintext,
    })

    if (error) {
      throw new EncryptionFailedError(`Database encryption failed: ${error.message}`)
    }

    // The function returns BYTEA, which Supabase returns as base64
    return data as string
  } catch (error) {
    if (error instanceof EncryptionFailedError) {
      throw error
    }
    throw new EncryptionFailedError(
      `Failed to encrypt PII: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}

/**
 * Decrypt an encrypted value using pgcrypto
 *
 * @param ciphertext - Base64-encoded encrypted data (BYTEA)
 * @returns Decrypted plaintext
 * @throws DecryptionFailedError if decryption fails
 */
export async function decryptPII(ciphertext: string): Promise<string> {
  if (!ciphertext) {
    throw new DecryptionFailedError("Cannot decrypt empty string")
  }

  try {
    const supabase = await createClient()

    // Call the decrypt_pii SQL function
    const { data, error } = await supabase.rpc("decrypt_pii", {
      ciphertext,
    })

    if (error) {
      throw new DecryptionFailedError(`Database decryption failed: ${error.message}`)
    }

    return data as string
  } catch (error) {
    if (error instanceof DecryptionFailedError) {
      throw error
    }
    throw new DecryptionFailedError(
      `Failed to decrypt PII: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}

/**
 * Encrypt all PII fields in a customer object
 *
 * @param pii - The customer PII object to encrypt
 * @returns Object with encrypted fields (_bytea suffix)
 * @throws EncryptionFailedError if any field fails to encrypt
 */
export async function encryptCustomerPII(pii: CustomerPII): Promise<{
  first_name_bytea: string
  last_name_bytea: string
  date_of_birth_bytea: string | null
  address_bytea: string | null
  phone_bytea: string
  email_bytea: string | null
  id_type_bytea: string | null
  id_number_bytea: string
}> {
  try {
    // Encrypt all required fields in parallel for performance
    const [
      first_name_bytea,
      last_name_bytea,
      id_number_bytea,
      phone_bytea,
    ] = await Promise.all([
      encryptPII(pii.first_name),
      encryptPII(pii.last_name),
      encryptPII(pii.id_number),
      encryptPII(pii.phone),
    ])

    // Encrypt optional fields if present
    const [
      date_of_birth_bytea,
      address_bytea,
      email_bytea,
      id_type_bytea,
    ] = await Promise.all([
      pii.date_of_birth ? encryptPII(pii.date_of_birth) : Promise.resolve(null),
      pii.address ? encryptPII(pii.address) : Promise.resolve(null),
      pii.email ? encryptPII(pii.email) : Promise.resolve(null),
      pii.id_type ? encryptPII(pii.id_type) : Promise.resolve(null),
    ])

    return {
      first_name_bytea,
      last_name_bytea,
      date_of_birth_bytea,
      address_bytea,
      phone_bytea,
      email_bytea,
      id_type_bytea,
      id_number_bytea,
    }
  } catch (error) {
    throw new EncryptionFailedError(
      `Failed to encrypt customer PII: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}

/**
 * Decrypt all PII fields from a customer database row
 *
 * Uses the get_customer_with_decrypted_data SQL function for efficient bulk decryption
 *
 * @param customerId - The customer ID to decrypt data for
 * @returns Decrypted customer PII object
 * @throws DecryptionFailedError if decryption fails
 */
export async function decryptCustomerPII(customerId: string): Promise<CustomerPII & {
  id: string
  branch_id: string
  risk_score: number
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  is_on_watchlist: boolean
  transaction_count: number
  total_gbp_volume: number
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc("get_customer_with_decrypted_data", {
      customer_id: customerId,
    })

    if (error) {
      throw new DecryptionFailedError(`Failed to decrypt customer data: ${error.message}`)
    }

    if (!data || Array.isArray(data) && data.length === 0) {
      throw new DecryptionFailedError("Customer not found")
    }

    // The function returns a set, get the first row
    const customer = Array.isArray(data) ? data[0] : data

    return {
      id: customer.id,
      branch_id: customer.branch_id,
      first_name: customer.first_name,
      last_name: customer.last_name,
      date_of_birth: customer.date_of_birth,
      address: customer.address,
      phone: customer.phone,
      email: customer.email,
      id_type: customer.id_type,
      id_number: customer.id_number,
      risk_score: customer.risk_score,
      risk_level: customer.risk_level,
      is_on_watchlist: customer.is_on_watchlist,
      transaction_count: customer.transaction_count,
      total_gbp_volume: customer.total_gbp_volume,
    }
  } catch (error) {
    if (error instanceof DecryptionFailedError) {
      throw error
    }
    throw new DecryptionFailedError(
      `Failed to decrypt customer PII: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}

/**
 * Batch decrypt multiple customers efficiently
 *
 * @param customerIds - Array of customer IDs to decrypt
 * @returns Map of customer ID to decrypted PII
 */
export async function batchDecryptCustomers(
  customerIds: string[]
): Promise<Map<string, CustomerPII & {
  id: string
  branch_id: string
  risk_score: number
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  is_on_watchlist: boolean
  transaction_count: number
  total_gbp_volume: number
}>> {
  const results = new Map()

  // Process in batches to avoid overwhelming the database
  const batchSize = 50

  for (let i = 0; i < customerIds.length; i += batchSize) {
    const batch = customerIds.slice(i, i + batchSize)

    await Promise.all(
      batch.map(async (customerId) => {
        try {
          const pii = await decryptCustomerPII(customerId)
          results.set(customerId, pii)
        } catch (error) {
          console.error(`Failed to decrypt customer ${customerId}:`, error)
        }
      })
    )
  }

  return results
}

/**
 * Generate a hash of customer PII for matching purposes
 * This is useful for finding duplicate customers without decrypting all records
 *
 * @param pii - Customer PII to hash
 * @returns SHA-256 hash of the PII for matching
 */
export async function hashCustomerPII(pii: Pick<CustomerPII, "first_name" | "last_name" | "date_of_birth">): Promise<string> {
  // Normalize the data for consistent hashing
  const normalized = JSON.stringify({
    first_name: pii.first_name.toLowerCase().trim(),
    last_name: pii.last_name.toLowerCase().trim(),
    date_of_birth: pii.date_of_birth || "",
  })

  return createHash("sha256").update(normalized).digest("hex")
}

/**
 * Mask PII for display purposes (e.g., in logs or partial display)
 *
 * @param value - The value to mask
 * @param showChars - Number of characters to show at the beginning
 * @returns Masked string
 */
export function maskPII(value: string, showChars: number = 2): string {
  if (!value) return ""

  if (value.length <= showChars) {
    return "*".repeat(value.length)
  }

  return value.substring(0, showChars) + "*".repeat(value.length - showChars)
}

/**
 * Format ID number for display (partial masking)
 */
export function formatIDNumberForDisplay(idNumber: string): string {
  if (!idNumber) return ""

  // Show last 4 characters only
  if (idNumber.length <= 4) {
    return idNumber
  }

  return "*".repeat(idNumber.length - 4) + idNumber.slice(-4)
}

/**
 * Format phone number for display (partial masking)
 */
export function formatPhoneForDisplay(phone: string): string {
  if (!phone) return ""

  // Show first 3 and last 4 digits
  if (phone.length <= 7) {
    return phone
  }

  return phone.substring(0, 3) + "****" + phone.slice(-4)
}
