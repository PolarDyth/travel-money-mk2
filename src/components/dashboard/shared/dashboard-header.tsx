"use client";

import { useState } from "react";
import { Wallet, LogOut, Settings, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserWithBranch } from "@/lib/hooks/use-user";
import type { UserRole } from "@/types";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

type DashboardHeaderProps = {
  user: UserWithBranch | null;
  isLoading?: boolean;
  drawerBalance?: number;
  showDrawerBalance?: boolean;
  posPosition?: string;
};

const ROLE_LABELS: Record<UserRole, string> = {
  operator: "Operator",
  supervisor: "Supervisor",
  manager: "Manager",
  admin: "Admin",
};

const ROLE_COLORS: Record<UserRole, string> = {
  operator: "bg-zinc-100 text-zinc-700",
  supervisor: "bg-blue-100 text-blue-700",
  manager: "bg-purple-100 text-purple-700",
  admin: "bg-red-100 text-red-700",
};

export function DashboardHeader({
  user,
  isLoading,
  drawerBalance,
  showDrawerBalance = false,
  posPosition,
}: DashboardHeaderProps) {
  const router = useRouter();
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const initials = user
    ? `${user.first_name?.charAt(0) ?? ""}${user.last_name?.charAt(0) ?? ""}`
    : "";

  const fullName = user
    ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim()
    : "";

  return (
    <header className="bg-black border-b border-[#C5A065] sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-[#C5A065] text-black px-3 py-1 text-sm font-semibold tracking-wide">
            M&S TRAVEL MONEY
          </div>
          <div className="h-6 w-px bg-zinc-700" />
          {isLoading ? (
            <Skeleton className="h-5 w-32 bg-zinc-800" />
          ) : (
            <div className="text-sm text-zinc-400">
              <span className="font-semibold text-white">
                {user?.branch?.name ?? "No Branch"}
              </span>
              {posPosition && <span> {posPosition}</span>}
            </div>
          )}
        </div>

        <div className="flex items-center gap-6">
          {showDrawerBalance && drawerBalance !== undefined && (
            <div
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 cursor-pointer hover:bg-zinc-800 transition-colors border border-zinc-800"
              onClick={() => setIsPrivacyMode(!isPrivacyMode)}
              title="Click to toggle privacy"
            >
              <Wallet className="w-4 h-4 text-[#C5A065]" />
              <span className="text-sm font-medium text-white">
                {isPrivacyMode
                  ? "••••••"
                  : `£${drawerBalance.toLocaleString("en-GB", {
                      minimumFractionDigits: 2,
                    })}`}
              </span>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center gap-2">
              <Skeleton className="w-8 h-8 rounded-full bg-zinc-800" />
              <Skeleton className="h-5 w-24 bg-zinc-800" />
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 hover:bg-zinc-900 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-[#C5A065] flex items-center justify-center text-black font-bold text-xs">
                    {initials}
                  </div>
                  <span className="text-sm font-medium text-zinc-300">
                    {fullName}
                  </span>
                  {user?.role && (
                    <Badge
                      variant="secondary"
                      className={`ml-1 text-xs ${ROLE_COLORS[user.role]}`}
                    >
                      {ROLE_LABELS[user.role]}
                    </Badge>
                  )}
                  <ChevronDown className="w-4 h-4 text-zinc-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="cursor-pointer">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-red-600 focus:text-red-600"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
