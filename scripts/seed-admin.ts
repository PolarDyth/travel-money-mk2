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

async function seedAdmin() {
  const email = process.argv[2]
  const password = process.argv[3]

  if (!email || !password) {
    console.error('Usage: npx tsx scripts/seed-admin.ts <email> <password>')
    process.exit(1)
  }

  console.log(`Setting up admin account for ${email}...`)

  // 1. Ensure a Branch Exists (Head Office)
  console.log('Checking for Head Office branch...')
  const { data: existingBranch, error: branchCheckError } = await supabase
    .from('branches')
    .select('id')
    .eq('code', 'HO')
    .single()

  let branchId = existingBranch?.id

  if (!branchId) {
    console.log('Creating Head Office branch...')
    const { data: newBranch, error: createBranchError } = await supabase
      .from('branches')
      .insert({
        name: 'Head Office',
        code: 'HO',
        address_line_1: '1 Admin Street',
        city: 'London',
        postcode: 'SW1A 1AA',
        country_code: 'GB',
        timezone: 'Europe/London',
        is_active: true
      })
      .select('id')
      .single()

    if (createBranchError) {
      console.error('Failed to create branch:', createBranchError)
      process.exit(1)
    }
    branchId = newBranch.id
  }
  
  console.log(`Using Branch ID: ${branchId}`)

  // 2. Create Auth User
  console.log('Creating auth user...')
  // Check if user exists first to avoid error
  const { data: { users } } = await supabase.auth.admin.listUsers()
  const existingUser = users.find(u => u.email === email)

  let userId = existingUser?.id

  if (!userId) {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: 'System',
        last_name: 'Admin'
      }
    })

    if (authError) {
      console.error('Failed to create auth user:', authError)
      process.exit(1)
    }
    userId = authData.user.id
    console.log(`Created Auth User: ${userId}`)
  } else {
    console.log(`User ${email} already exists. Updating profile...`)
  }

  // 3. Create or Update Staff Profile
  console.log('Setting up staff profile...')
  const { error: profileError } = await supabase
    .from('staff_profiles')
    .upsert({
      id: userId!,
      first_name: 'System',
      last_name: 'Admin',
      employee_number: 'ADMIN001',
      role: 'admin',
      branch_id: branchId,
      is_active: true,
      requires_new_password: false
      // email column removed based on previous fixes
    })

  if (profileError) {
    console.error('Failed to create/update staff profile:', profileError)
    process.exit(1)
  }

  console.log('✅ Admin account setup complete!')
  console.log('You can now log in at /login')
}

seedAdmin()
