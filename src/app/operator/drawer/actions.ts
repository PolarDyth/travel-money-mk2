'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// Validators
const OpenDrawerSchema = z.object({
  counts: z.array(
    z.object({
      denomination_id: z.string(),
      count: z.number().min(0),
    })
  ),
  total_gbp: z.number().min(0), // Calculated total in GBP
  branch_id: z.uuid(),
  notes: z.string().optional(),
});

const CloseDrawerSchema = z.object({
  counts: z.array(
    z.object({
      denomination_id: z.string(),
      count: z.number().min(0),
    })
  ),
  total_gbp: z.number().min(0), // Calculated total in GBP,
  expected_gbp: z.number().optional(), // Passed from UI for reference but should be calculated on server really
  session_id: z.uuid(),
  notes: z.string().optional(),
});

export async function openDrawerSession(input: z.infer<typeof OpenDrawerSchema>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Check for existing open session
  const { data: existingSession } = await supabase
    .from('drawer_sessions')
    .select('id')
    .eq('operator_id', user.id)
    .eq('status', 'open')
    .maybeSingle();

  if (existingSession) {
    return { error: 'You already have an open drawer session.' };
  }

  // 1. Create Session
  const { data: session, error: sessionError } = await supabase
    .from('drawer_sessions')
    .insert({
      branch_id: input.branch_id,
      operator_id: user.id,
      opening_verified_by: user.id, // Self-verified for now, or supervisor?
      opened_at: new Date().toISOString(),
      opening_float_gbp: input.total_gbp,
      status: 'open',
      till_number: 1, // Defaulting to 1 for now
    })
    .select()
    .single();

  if (sessionError) {
    console.error('Error creating drawer session:', sessionError);
    return { error: 'Failed to create drawer session.' };
  }

  // 2. Insert Denomination Counts
  if (input.counts.length > 0) {
    const { error: countsError } = await supabase
      .from('drawer_denomination_counts')
      .insert(
        input.counts.map((c) => ({
          session_id: session.id,
          denomination_id: c.denomination_id,
          quantity: c.count,
          count_type: 'opening',
        }))
      );

    if (countsError) {
      console.error('Error recording counts:', countsError);
      // Rollback? ideally yes, but manually for now
      await supabase.from('drawer_sessions').delete().eq('id', session.id);
      return { error: 'Failed to record denomination counts.' };
    }
  }

  revalidatePath('/operator');
  revalidatePath('/operator/drawer');
  return { success: true, sessionId: session.id };
}

export async function closeDrawerSession(input: z.infer<typeof CloseDrawerSchema>) {
  const supabase = await createClient();
    const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // 1. Update Session
  const { error: sessionError } = await supabase
    .from('drawer_sessions')
    .update({
      closing_verified_by: user.id,
      closed_at: new Date().toISOString(),
      closing_float_gbp: input.total_gbp,
      expected_float_gbp: input.expected_gbp, // Should verify this server-side
      status: 'closed',
      closing_notes: input.notes,
    })
    .eq('id', input.session_id)
    .eq('operator_id', user.id);

  if (sessionError) {
    console.error('Error closing drawer session:', sessionError);
    return { error: 'Failed to close drawer session.' };
  }

  // 2. Insert Denomination Counts
  if (input.counts.length > 0) {
    const { error: countsError } = await supabase
      .from('drawer_denomination_counts')
      .insert(
        input.counts.map((c) => ({
          session_id: input.session_id,
          denomination_id: c.denomination_id,
          quantity: c.count,
          count_type: 'closing',
        }))
      );

    if (countsError) {
      console.error('Error recording closing counts:', countsError);
       // This is bad state - session closed but counts missing.
       // We'll return error but the session is closed.
      return { error: 'Session closed, but failed to record individual counts.' };
    }
  }

  revalidatePath('/operator');
  revalidatePath('/operator/drawer');
  return { success: true };
}
