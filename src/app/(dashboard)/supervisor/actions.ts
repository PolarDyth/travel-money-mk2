'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { hasRoleOrHigher, type UserRole } from '@/types';

const TillActionSchema = z.object({
  session_id: z.string().uuid(),
  reason: z.string().min(5).max(500),
});

async function getSupervisorProfile(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('staff_profiles')
    .select('id, role, is_active, branch_id')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return { error: 'Supervisor profile not found.' };
  }

  if (!data.is_active) {
    return { error: 'Account is inactive.' };
  }

  if (!hasRoleOrHigher(data.role as UserRole, 'supervisor')) {
    return { error: 'Insufficient permissions.' };
  }

  return { data };
}

async function getSessionForAction(sessionId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('drawer_sessions')
    .select('id, status, branch_id, operator_id')
    .eq('id', sessionId)
    .single();

  if (error || !data) {
    return { error: 'Drawer session not found.' };
  }

  if (data.status !== 'open') {
    return { error: `Only open sessions can be updated. Current status: ${data.status}.` };
  }

  return { data };
}

async function getRlsDiagnostics(userId: string, sessionOperatorId: string) {
  const supabase = await createClient();
  const { data: isActiveData, error: isActiveError } = await supabase.rpc(
    'is_active_staff'
  );
  const { data: hasRoleData, error: hasRoleError } = await supabase.rpc(
    'has_role_or_higher',
    { required_role: 'supervisor' }
  );

  return {
    isActiveStaff: isActiveError ? `error: ${isActiveError.message}` : isActiveData,
    hasSupervisorRole: hasRoleError ? `error: ${hasRoleError.message}` : hasRoleData,
    isOperator: sessionOperatorId === userId,
  };
}

export async function suspendDrawerSession(input: z.infer<typeof TillActionSchema>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated.' };
  }

  const parsed = TillActionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: `Invalid input: ${parsed.error.issues
        .map((issue) => `${issue.path.join('.') || 'field'} ${issue.message}`)
        .join(', ')}`,
    };
  }

  const profileResult = await getSupervisorProfile(user.id);
  if (profileResult.error || !profileResult.data) {
    return { error: profileResult.error ?? 'Unable to validate profile.' };
  }

  const sessionResult = await getSessionForAction(parsed.data.session_id);
  if (sessionResult.error || !sessionResult.data) {
    return { error: sessionResult.error ?? 'Unable to validate session.' };
  }

  if (sessionResult.data.branch_id !== profileResult.data.branch_id) {
    return { error: 'Cannot modify sessions for another branch.' };
  }

  const { error } = await supabase
    .from('drawer_sessions')
    .update({
      status: 'suspended',
      closing_notes: `Suspended: ${parsed.data.reason}`,
    })
    .eq('id', parsed.data.session_id)
    .eq('status', 'open');

  if (error) {
    console.error('Error suspending drawer session:', error);
    const diagnostics = await getRlsDiagnostics(user.id, sessionResult.data.operator_id);
    return {
      error: `Failed to suspend drawer session: ${error.message}. RLS check -> is_active_staff=${diagnostics.isActiveStaff}, has_role_or_higher(supervisor)=${diagnostics.hasSupervisorRole}, operator_id_match=${diagnostics.isOperator}`,
    };
  }

  const { error: notificationError } = await supabase
    .from('operator_notifications')
    .insert({
      operator_id: sessionResult.data.operator_id,
      session_id: parsed.data.session_id,
      type: 'till_suspended',
      message: `Your till was suspended by a supervisor. Reason: ${parsed.data.reason}`,
    });

  if (notificationError) {
    console.error('Error creating operator notification:', notificationError);
  }

  revalidatePath('/supervisor');
  return { success: true };
}

export async function forceCloseDrawerSession(input: z.infer<typeof TillActionSchema>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated.' };
  }

  const parsed = TillActionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: `Invalid input: ${parsed.error.issues
        .map((issue) => `${issue.path.join('.') || 'field'} ${issue.message}`)
        .join(', ')}`,
    };
  }

  const profileResult = await getSupervisorProfile(user.id);
  if (profileResult.error || !profileResult.data) {
    return { error: profileResult.error ?? 'Unable to validate profile.' };
  }

  const sessionResult = await getSessionForAction(parsed.data.session_id);
  if (sessionResult.error || !sessionResult.data) {
    return { error: sessionResult.error ?? 'Unable to validate session.' };
  }

  if (sessionResult.data.branch_id !== profileResult.data.branch_id) {
    return { error: 'Cannot modify sessions for another branch.' };
  }

  const { error } = await supabase
    .from('drawer_sessions')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      closing_verified_by: user.id,
      closing_notes: `Force closed: ${parsed.data.reason}`,
    })
    .eq('id', parsed.data.session_id)
    .eq('status', 'open');

  if (error) {
    console.error('Error force closing drawer session:', error);
    const diagnostics = await getRlsDiagnostics(user.id, sessionResult.data.operator_id);
    return {
      error: `Failed to force close drawer session: ${error.message}. RLS check -> is_active_staff=${diagnostics.isActiveStaff}, has_role_or_higher(supervisor)=${diagnostics.hasSupervisorRole}, operator_id_match=${diagnostics.isOperator}`,
    };
  }

  const { error: notificationError } = await supabase
    .from('operator_notifications')
    .insert({
      operator_id: sessionResult.data.operator_id,
      session_id: parsed.data.session_id,
      type: 'till_force_closed',
      message: `Your till was force closed by a supervisor. Reason: ${parsed.data.reason}`,
    });

  if (notificationError) {
    console.error('Error creating operator notification:', notificationError);
  }

  revalidatePath('/supervisor');
  return { success: true };
}
