import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { CustomerInvestigationPanel } from "@/components/compliance/customer-investigation-panel"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CustomerInvestigationPage({ params }: PageProps) {
  const { id } = await params
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

  return <CustomerInvestigationPanel customerId={id} />
}
