import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { DrawerManager } from "@/components/operator/drawer/drawer-manager";
import { getActiveDrawerSession, getDenominations, getDrawerSummary, getExchangeRates } from "@/lib/queries/drawer";

export default async function DrawerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Fetch staff profile to get branch_id
  const { data: profile } = await supabase
    .from("staff_profiles")
    .select("branch_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return <div>Error loading staff profile.</div>;
  }

  // Parallel fetch: session and static data
  const [denominations, exchangeRates, activeSession] = await Promise.all([
    getDenominations(),
    getExchangeRates(),
    getActiveDrawerSession(user.id),
  ]);

  let drawerSummary = null;
  if (activeSession) {
    drawerSummary = await getDrawerSummary(activeSession.id);
  }

  return (
    <div className="container py-8">
      <DrawerManager 
        session={drawerSummary}
        denominations={denominations}
        exchangeRates={exchangeRates}
        branchId={profile.branch_id}
      />
    </div>
  );
}
