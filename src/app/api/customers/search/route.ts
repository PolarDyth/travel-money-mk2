'use server'

import { createClient } from "@/utils/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { customerSearchSchema, type CustomerSearchResult } from "@/app/(dashboard)/operator/transaction/schemas"
import { captureError } from "@/lib/errors"

/**
 * Search for customers by name and postcode
 *
 * POST /api/customers/search
 *
 * This endpoint searches for existing customers matching the provided
 * name and postcode. Returns customer data WITHOUT ID numbers for
 * security - ID must be re-entered each time.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { message: "Unauthorized" } },
        { status: 401 }
      )
    }

    // Get staff profile with branch
    const { data: staff, error: staffError } = await supabase
      .from('staff_profiles')
      .select('id, branch_id')
      .eq('id', user.id)
      .eq('is_active', true)
      .single()

    if (staffError || !staff) {
      return NextResponse.json(
        { success: false, error: { message: "Staff profile not found" } },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await req.json()
    const validationResult = customerSearchSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Invalid search criteria",
            details: validationResult.error.issues
          }
        },
        { status: 400 }
      )
    }

    const { first_name, last_name, postcode } = validationResult.data

    // DEBUG: Log search input
    console.log('=== CUSTOMER SEARCH DEBUG ===')
    console.log('Search input:', { first_name, last_name, postcode })
    console.log('Staff branch_id:', staff.branch_id)

    // Search for customers using decrypted name and postcode match
    // We need to use the search_customers_by_name RPC function and filter by postcode
    const { data: nameResults, error: searchError } = await supabase.rpc(
      "search_customers_by_name",
      {
        search_term: `${first_name} ${last_name}`,
        search_branch_id: staff.branch_id
      }
    )

    // DEBUG: Log raw results from name search
    console.log('Name search results:', JSON.stringify(nameResults, null, 2))
    console.log('Name search error:', searchError)

    if (searchError) {
      captureError(searchError, { action: "searchCustomer", staffId: staff.id })
      return NextResponse.json(
        { success: false, error: { message: "Search failed" } },
        { status: 500 }
      )
    }

    if (!nameResults || !Array.isArray(nameResults) || nameResults.length === 0) {
      return NextResponse.json({
        success: true,
        data: []
      })
    }

    // Filter by postcode (we need to decrypt each customer to check postcode)
    const customerIds = nameResults.map((r: { id: string }) => r.id)

    const { data: customers, error: fetchError } = await supabase
      .from("customers")
      .select("id")
      .in("id", customerIds)

    if (fetchError) {
      return NextResponse.json(
        { success: false, error: { message: "Failed to fetch customer details" } },
        { status: 500 }
      )
    }

    // Now get decrypted data for each customer and filter by postcode
    const matches: CustomerSearchResult[] = []
    const debugInfo: any[] = []

    const searchPostcodeNormalized = postcode.replace(/\s/g, '').toUpperCase()
    console.log('Search postcode (normalized):', searchPostcodeNormalized)

    for (const customer of customers || []) {
      console.log(`--- Processing customer: ${customer.id} ---`)

      const { data: decrypted } = await supabase.rpc(
        "get_customer_with_decrypted_data",
        { customer_id: customer.id }
      )

      console.log(`Decrypted data for ${customer.id}:`, JSON.stringify(decrypted, null, 2))

      if (!decrypted) {
        console.log(`Skipping ${customer.id}: no decrypted data`)
        continue
      }

      // The RPC function returns an array - take the first element
      const decryptedData = Array.isArray(decrypted) ? decrypted[0] : decrypted

      if (!decryptedData) {
        console.log(`Skipping ${customer.id}: no data in array`)
        continue
      }

      // Extract postcode from address field
      // Address format is "Address Line 1, City, Postcode"
      // The postcode is the last comma-separated part
      const addressParts = (decryptedData.address || '').split(',').map(p => p.trim())
      const extractedPostcode = addressParts.length > 0 ? addressParts[addressParts.length - 1] : ''

      // Check if postcode matches (case-insensitive, strip spaces)
      const customerPostcode = extractedPostcode.replace(/\s/g, '').toUpperCase()

      console.log(`Postcode comparison:`)
      console.log(`  Search postcode: "${searchPostcodeNormalized}"`)
      console.log(`  Customer address: "${decryptedData.address}"`)
      console.log(`  Address parts:`, addressParts)
      console.log(`  Extracted postcode: "${extractedPostcode}"`)
      console.log(`  Customer postcode (normalized): "${customerPostcode}"`)
      console.log(`  Match: ${customerPostcode === searchPostcodeNormalized}`)

      debugInfo.push({
        customerId: customer.id,
        address: decryptedData.address,
        addressParts,
        extractedPostcode,
        customerPostcode,
        searchPostcode: searchPostcodeNormalized,
        match: customerPostcode === searchPostcodeNormalized
      })

      if (customerPostcode === searchPostcodeNormalized) {
        // Parse city from address (address format is "Address Line 1, City, Postcode")
        // City is the second-to-last part
        const city = addressParts.length > 1
          ? addressParts[addressParts.length - 2] || undefined
          : undefined

        // Parse address line 1 (everything before the last two parts)
        const addressLine1 = addressParts.length > 2
          ? addressParts.slice(0, -2).join(', ')
          : addressParts.length > 0
            ? addressParts[0]
            : undefined

        matches.push({
          id: customer.id,
          first_name: decryptedData.first_name || '',
          last_name: decryptedData.last_name || '',
          address_line_1: addressLine1,
          city: city,
          postcode: extractedPostcode,
          id_type: decryptedData.id_type,
          // Note: id_number is intentionally excluded
        })
      }
    }

    console.log('=== SEARCH COMPLETE ===')
    console.log('Matches found:', matches.length)
    console.log('All debug info:', JSON.stringify(debugInfo, null, 2))

    return NextResponse.json({
      success: true,
      data: matches,
      debug: {
        searchInput: { first_name, last_name, postcode },
        searchPostcodeNormalized,
        nameResultsCount: nameResults?.length || 0,
        processedCount: debugInfo.length,
        matchesCount: matches.length,
        details: debugInfo
      }
    })

  } catch (error) {
    captureError(error instanceof Error ? error : new Error(String(error)), { action: "searchCustomer" })
    return NextResponse.json(
      { success: false, error: { message: "Internal server error" } },
      { status: 500 }
    )
  }
}
