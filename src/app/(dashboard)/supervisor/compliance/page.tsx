import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { SupervisorComplianceDashboard } from "@/components/compliance/supervisor-compliance-dashboard"
import { hasRoleOrHigher } from "@/types"

export default async function SupervisorCompliancePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("staff_profiles")
    .select("id, role, branch_id, is_active")
    .eq("id", user.id)
    .single()

  if (!profile || !profile.is_active || !hasRoleOrHigher(profile.role, "supervisor")) {
    redirect("/")
  }

  if (!profile.branch_id) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-bold text-black">Access Denied</h1>
        <p className="text-zinc-600 mt-2">
          You must be assigned to a branch to access the compliance dashboard.
        </p>
      </div>
    )
  }

  return <SupervisorComplianceDashboard branchId={profile.branch_id} />
}
