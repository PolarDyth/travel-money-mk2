import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

// Note: This client uses the SERVICE_ROLE_KEY and should ONLY be used
// in server actions or API routes where the user is an admin or we need
// to bypass RLS. NEVER expose this to the client.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, 
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
