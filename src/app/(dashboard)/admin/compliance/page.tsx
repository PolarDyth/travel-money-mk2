import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { AdminComplianceDashboard } from "@/components/compliance/admin-compliance-dashboard"

export default async function AdminCompliancePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("staff_profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .single()

  if (!profile || !profile.is_active || profile.role !== "admin") {
    redirect("/")
  }

  return <AdminComplianceDashboard adminId={profile.id} />
}
