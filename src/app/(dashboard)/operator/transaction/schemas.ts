import { z } from "zod"

// Zod validation schema for rate override
export const rateOverrideSchema = z.object({
  original_rate: z.number().positive("Original rate must be positive"),
  override_rate: z.number().positive("Override rate must be positive"),
  reason: z.string().min(10, "Reason must be at least 10 characters").max(500, "Reason must not exceed 500 characters"),
  acknowledged: z.boolean().refine(val => val === true, "You must acknowledge this creates an audit trail"),
  has_manager_approval: z.boolean().optional(),
})

export type RateOverrideInput = z.infer<typeof rateOverrideSchema>

// Zod schema for customer search
export const customerSearchSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required"),
  last_name: z.string().trim().min(1, "Last name is required"),
  postcode: z.string().trim().min(1, "Postcode is required"),
})

export type CustomerSearchInput = z.infer<typeof customerSearchSchema>

// Zod schema for customer data returned from search (ID is always excluded)
export const customerSearchResultSchema = z.object({
  id: z.string().uuid(),
  first_name: z.string(),
  last_name: z.string(),
  address_line_1: z.string().optional(),
  city: z.string().optional(),
  postcode: z.string().optional(),
  id_type: z.string().optional(),
  // Note: id_reference is intentionally excluded for security
})

export type CustomerSearchResult = z.infer<typeof customerSearchResultSchema>

// Zod validation schema for transactions
export const transactionDraftSchema = z.object({
  type: z.enum(['buy', 'sell']),
  currency_code: z.string().min(3).max(3),
  foreign_amount: z.number().positive("Foreign amount must be positive"),
  base_amount: z.number().positive("Base amount must be positive"),
  exchange_rate: z.number().positive("Exchange rate must be positive"),
  rate_id: z.uuid().optional(),
  rate_override: rateOverrideSchema.optional(),
  customer: z.object({
    first_name: z.string().trim().min(1, "First name is required").optional(),
    last_name: z.string().trim().min(1, "Last name is required").optional(),
    address_line_1: z.string().trim().optional(),
    city: z.string().trim().optional(),
    postcode: z.string().trim().optional(),
    id_type: z.string().trim().optional(),
    id_reference: z.string().trim().optional(),
  }).optional(),
  payment_method: z.enum(['cash', 'card']).optional(),
  denominations: z.array(
    z.object({
      denomination_id: z.string().uuid("Invalid denomination ID"),
      count: z.number().int().min(0, "Count must be non-negative integer"),
    })
  ).optional(),
})

export type TransactionDraft = z.infer<typeof transactionDraftSchema>
