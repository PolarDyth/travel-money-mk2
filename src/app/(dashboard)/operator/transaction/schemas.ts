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
  ).min(1, "At least one denomination is required"),
})

export type TransactionDraft = z.infer<typeof transactionDraftSchema>
