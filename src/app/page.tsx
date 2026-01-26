import { createClient } from "@/utils/supabase/server";
import { LoginView } from "@/app/(auth)/login/login-view";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { ManagerDashboard } from "@/components/dashboard/manager-dashboard";
import { OperatorDashboard } from "@/components/dashboard/operator-dashboard";
import { SupervisorDashboard } from "@/components/dashboard/supervisor-dashboard";
import { ROLE_HIERARCHY, USER_ROLES, type UserRole } from "@/types";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const normalizeParam = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

const isUserRole = (value?: string): value is UserRole =>
  !!value && USER_ROLES.includes(value as UserRole);

export default async function Home(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const requestedRole = normalizeParam(searchParams.view);
  const error = normalizeParam(searchParams.error);

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return <LoginView error={error} />;
  }

  const { data: profile, error: profileError } = await supabase
    .from("staff_profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || !profile.is_active) {
    await supabase.auth.signOut();
    return <LoginView error={profile?.is_active === false ? "inactive" : "no_profile"} />;
  }

  const userRole = profile.role as UserRole;
  const effectiveRole = isUserRole(requestedRole) && ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requestedRole]
    ? requestedRole
    : userRole;

  switch (effectiveRole) {
    case "admin":
      return <AdminDashboard />;
    case "manager":
      return <ManagerDashboard />;
    case "supervisor":
      return <SupervisorDashboard />;
    case "operator":
    default:
      return <OperatorDashboard />;
  }
}
