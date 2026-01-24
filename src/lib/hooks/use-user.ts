"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import type { StaffProfile, UserRole, Branch } from "@/types";
import { hasRoleOrHigher } from "@/types";

export type UserWithBranch = StaffProfile & {
  branch: Branch | null;
};

type UseUserReturn = {
  user: UserWithBranch | null;
  isLoading: boolean;
  error: Error | null;
  hasRole: (required: UserRole) => boolean;
  refetch: () => Promise<void>;
};

export function useUser(): UseUserReturn {
  const [user, setUser] = useState<UserWithBranch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        setUser(null);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("staff_profiles")
        .select(`
          *,
          branch:branches(*)
        `)
        .eq("id", authData.user.id)
        .eq("is_active", true)
        .single();

      if (profileError) {
        throw new Error(profileError.message);
      }

      setUser(profile as UserWithBranch);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch user"));
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();

    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUser();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUser]);

  const hasRole = useCallback(
    (required: UserRole): boolean => {
      if (!user) return false;
      return hasRoleOrHigher(user.role, required);
    },
    [user]
  );

  return {
    user,
    isLoading,
    error,
    hasRole,
    refetch: fetchUser,
  };
}
