"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Search, UserCheck, UserX, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getStaffDirectory,
  getStaffCounts,
  type StaffDirectoryEntry,
  type StaffCounts,
} from "@/lib/queries/admin";
import type { UserRole } from "@/types";
import { AddStaffDialog } from "./add-staff-dialog";

type StaffDirectoryProps = {
  className?: string;
};

const ROLE_COLORS: Record<UserRole, string> = {
  operator: "bg-zinc-100 text-zinc-700",
  supervisor: "bg-blue-100 text-blue-700",
  manager: "bg-purple-100 text-purple-700",
  admin: "bg-red-100 text-red-700",
};

function formatLastLogin(dateStr: string | null): string {
  if (!dateStr) return "Never";

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 1) return "< 1h ago";
  if (diffHours < 24) return `${Math.round(diffHours)}h ago`;
  if (diffHours < 168) return `${Math.round(diffHours / 24)}d ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function StaffDirectory({ className }: StaffDirectoryProps) {
  const [staff, setStaff] = useState<StaffDirectoryEntry[]>([]);
  const [counts, setCounts] = useState<StaffCounts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const [staffData, countsData] = await Promise.all([
        getStaffDirectory(),
        getStaffCounts(),
      ]);
      setStaff(staffData);
      setCounts(countsData);
      setIsLoading(false);
    }

    fetchData();
  }, []);

  const filteredStaff = useMemo(() => {
    if (!searchQuery) return staff;

    const query = searchQuery.toLowerCase();
    return staff.filter(
      (s) =>
        s.firstName.toLowerCase().includes(query) ||
        s.lastName.toLowerCase().includes(query) ||
        s.employeeNumber.toLowerCase().includes(query)
    );
  }, [staff, searchQuery]);

  if (isLoading) {
    return (
      <Card className={cn("rounded-none border-zinc-200", className)}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-8" />
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
            <Skeleton className="h-40" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("rounded-none border-zinc-200", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-600 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Staff Directory
          </CardTitle>
          <AddStaffDialog />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        {counts && (
          <div className="grid grid-cols-4 gap-2">
            <div className="p-2 bg-zinc-50 border border-zinc-200 text-center">
              <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                <UserCheck className="w-3 h-3" />
              </div>
              <p className="text-lg font-bold">{counts.active}</p>
              <p className="text-[10px] text-zinc-500 uppercase">Active</p>
            </div>
            <div className="p-2 bg-zinc-50 border border-zinc-200 text-center">
              <div className="flex items-center justify-center gap-1 text-zinc-400 mb-1">
                <UserX className="w-3 h-3" />
              </div>
              <p className="text-lg font-bold">{counts.inactive}</p>
              <p className="text-[10px] text-zinc-500 uppercase">Inactive</p>
            </div>
            <div className="p-2 bg-zinc-50 border border-zinc-200 text-center">
              <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                <Clock className="w-3 h-3" />
              </div>
              <p className="text-lg font-bold">{counts.recentLogins}</p>
              <p className="text-[10px] text-zinc-500 uppercase">24h Logins</p>
            </div>
            <div className="p-2 bg-zinc-50 border border-zinc-200 text-center">
              <p className="text-lg font-bold">
                {counts.active + counts.inactive}
              </p>
              <p className="text-[10px] text-zinc-500 uppercase">Total</p>
            </div>
          </div>
        )}

        {/* Role Breakdown */}
        {counts && (
          <div className="flex flex-wrap gap-2">
            {(Object.entries(counts.byRole) as [UserRole, number][]).map(
              ([role, count]) => (
                <Badge
                  key={role}
                  variant="secondary"
                  className={cn("text-xs", ROLE_COLORS[role])}
                >
                  {role}: {count}
                </Badge>
              )
            )}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, employee number, or email..."
            className="pl-8 h-8 rounded-none text-sm"
          />
        </div>

        {/* Staff List */}
        <div className="max-h-[300px] overflow-y-auto border border-zinc-200">
          {filteredStaff.length === 0 ? (
            <div className="py-8 text-center text-zinc-500">
              <Users className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
              <p className="text-sm">No staff found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-zinc-500 uppercase">
                    Name
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-zinc-500 uppercase">
                    Role
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-zinc-500 uppercase">
                    Branch
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-zinc-500 uppercase">
                    Last Login
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredStaff.map((s) => (
                  <tr
                    key={s.id}
                    className={cn(
                      "hover:bg-zinc-50",
                      !s.isActive && "opacity-50"
                    )}
                  >
                    <td className="px-3 py-2">
                      <div>
                        <p className="font-medium">
                          {s.firstName} {s.lastName}
                        </p>
                        <p className="text-xs text-zinc-500">{s.employeeNumber}</p>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant="secondary"
                        className={cn("text-[10px] capitalize", ROLE_COLORS[s.role])}
                      >
                        {s.role}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-zinc-600">{s.branchName}</td>
                    <td className="px-3 py-2 text-zinc-500 text-xs">
                      {formatLastLogin(s.lastLoginAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
