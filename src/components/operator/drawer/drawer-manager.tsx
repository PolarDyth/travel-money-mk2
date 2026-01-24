'use client';

import { useState } from 'react';
import { DenominationWithCurrency, DrawerSummary } from '@/lib/queries/drawer';
import { OpenDrawerForm } from './open-drawer-form';
import { ActiveSessionView } from './active-session-view';

interface DrawerManagerProps {
  session: DrawerSummary | null; // Null implies no active session
  denominations: DenominationWithCurrency[];
  exchangeRates: Record<string, number>;
  branchId: string;
}

export function DrawerManager({ 
  session, 
  denominations, 
  exchangeRates,
  branchId
}: DrawerManagerProps) {
  // If we have a session, we are in "Active" mode. If not, "Opening" mode.
  // The ActiveSessionView can handle switching to "Closing" mode internally or we handle here.
  // Let's handle generic state here.
  
  if (!session) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Open Drawer</h1>
          <p className="text-muted-foreground">Count the float to begin your session.</p>
        </div>
        <OpenDrawerForm 
          denominations={denominations} 
          exchangeRates={exchangeRates} 
          branchId={branchId}
        />
      </div>
    );
  }

  return (
    <ActiveSessionView 
      session={session} 
      denominations={denominations} 
      exchangeRates={exchangeRates} 
    />
  );
}
