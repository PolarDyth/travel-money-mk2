import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("staff_profiles")
    .select("role")
    .eq("id", user.id)
    .eq("is_active", true)
    .single();

  if (profileError || !profile) {
    // User authenticated but no active staff profile
    redirect("/login?error=no_profile");
  }

  // Route based on role
  switch (profile.role) {
    case "admin":
      redirect("/admin");
    case "manager":
      redirect("/manager");
    case "supervisor":
      redirect("/supervisor");
    case "operator":
    default:
      redirect("/operator");
  }
}
