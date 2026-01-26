"use client";

import Link from "next/link";
import { LogOut, Settings, ChevronDown, LayoutDashboard, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/utils/supabase/client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { UserWithBranch } from "@/lib/hooks/use-user";
import { ROLE_HIERARCHY, USER_ROLES, type UserRole } from "@/types";

import { Badge } from "@/components/ui/badge";

interface SiteHeaderProps {
  user: UserWithBranch | null;
}

export function SiteHeader({ user }: SiteHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const isAuthRoute =
    pathname === "/" ? !user : pathname.startsWith("/login") || pathname.startsWith("/forgot-password") || pathname.startsWith("/auth");

  if (isAuthRoute) {
    return null;
  }

  const availableRoles = user?.role
    ? USER_ROLES
        .filter((role) => ROLE_HIERARCHY[role] <= ROLE_HIERARCHY[user.role])
        .sort((a, b) => ROLE_HIERARCHY[b] - ROLE_HIERARCHY[a])
    : [];

  const requestedRole = searchParams.get("view") as UserRole | null;
  const activeRole =
    requestedRole && availableRoles.includes(requestedRole)
      ? requestedRole
      : user?.role ?? null;

  const handleSwitchDashboard = (role: UserRole) => {
    const target = role === user?.role ? "/" : `/?view=${role}`;
    router.push(target);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  const roleLabels: Record<UserRole, string> = {
    admin: "Admin Dashboard",
    manager: "Manager Dashboard",
    supervisor: "Supervisor Dashboard",
    operator: "Operator Dashboard",
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-black text-white border-b border-zinc-800">
      <div className="max-w-7xl mx-auto flex h-14 items-center w-full px-4">
        <Link href="/" className="flex items-center">
            <div className="flex items-center justify-center bg-[#C5A065] text-black px-4 py-1.5 font-bold text-sm tracking-wide hover:bg-[#b08d55] transition-colors rounded-sm mr-6">
                M&S TRAVEL MONEY
            </div>
        </Link>
        {user?.branch?.name && (
            <div className="hidden md:flex items-center text-sm font-semibold text-white border-l border-zinc-700 pl-4 h-8">
                {user.branch.name}
            </div>
        )}
        
        <div className="flex flex-1 items-center justify-end space-x-6">
          {user ? (
            <div className="flex items-center gap-4">
               <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative flex items-center gap-3 hover:bg-zinc-900 px-2 py-1.5 h-auto rounded-lg">
                    <div className="h-9 w-9 rounded-full bg-[#C5A065] text-black flex items-center justify-center font-bold">
                        {user.first_name?.[0]}{user.last_name?.[0]}
                    </div>
                    
                    <div className="hidden sm:flex flex-col items-start">
                        <span className="text-sm font-medium text-white">{user.first_name} {user.last_name}</span>
                    </div>
                    
                    {user.role && (
                        <Badge variant="secondary" className="bg-red-100 text-red-700 hover:bg-red-200 capitalize rounded-sm px-2 font-normal">
                        {user.role}
                        </Badge>
                    )}
                    
                    <ChevronDown className="h-4 w-4 text-zinc-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{user.first_name} {user.last_name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  {availableRoles.length > 1 && (
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>Switch Dashboard</DropdownMenuLabel>
                      {availableRoles.map((role) => {
                        const isActive = role === activeRole;
                        return (
                          <DropdownMenuItem
                            key={role}
                            onSelect={() => handleSwitchDashboard(role)}
                            disabled={isActive}
                          >
                            {isActive ? (
                              <Check className="mr-2 h-4 w-4" />
                            ) : (
                              <LayoutDashboard className="mr-2 h-4 w-4" />
                            )}
                            <span>{roleLabels[role]}</span>
                          </DropdownMenuItem>
                        );
                      })}
                      <DropdownMenuSeparator />
                    </DropdownMenuGroup>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <Link href="/">
               <Button variant="ghost" size="sm">Login</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
