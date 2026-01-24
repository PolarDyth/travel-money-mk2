"use client";

import { ReactNode } from "react";
import { DashboardHeader } from "./dashboard-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type { UserWithBranch } from "@/lib/hooks/use-user";

type DashboardShellProps = {
  user: UserWithBranch | null;
  isLoading: boolean;
  error: Error | null;
  children: ReactNode;
  drawerBalance?: number;
  showDrawerBalance?: boolean;
  posPosition?: string;
};

export function DashboardShell({
  user,
  isLoading,
  error,
  children,
  drawerBalance,
  showDrawerBalance,
  posPosition,
}: DashboardShellProps) {
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <DashboardHeader user={null} isLoading={false} />
        <main className="flex-1 max-w-7xl mx-auto w-full p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error.message || "An error occurred while loading your profile."}
            </AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <DashboardHeader user={null} isLoading={true} />
        <main className="flex-1 max-w-7xl mx-auto w-full p-6">
          <DashboardLoadingSkeleton />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <DashboardHeader
        user={user}
        isLoading={isLoading}
        drawerBalance={drawerBalance}
        showDrawerBalance={showDrawerBalance}
        posPosition={posPosition}
      />
      <main className="flex-1 max-w-7xl mx-auto w-full p-6">{children}</main>
    </div>
  );
}

function DashboardLoadingSkeleton() {
  return (
    <div className="grid grid-rows-[auto_1fr] gap-6">
      {/* Primary action area skeleton */}
      <section className="grid grid-cols-12 gap-6 h-[220px]">
        <Skeleton className="col-span-5 h-full" />
        <Skeleton className="col-span-5 h-full" />
        <div className="col-span-2 flex flex-col gap-4">
          <Skeleton className="flex-1" />
          <Skeleton className="flex-1" />
        </div>
      </section>

      {/* Info deck skeleton */}
      <section className="grid grid-cols-12 gap-6">
        <div className="col-span-8">
          <Skeleton className="h-8 w-32 mb-4" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
        <div className="col-span-4">
          <Skeleton className="h-8 w-32 mb-4" />
          <Skeleton className="h-64" />
        </div>
      </section>
    </div>
  );
}
