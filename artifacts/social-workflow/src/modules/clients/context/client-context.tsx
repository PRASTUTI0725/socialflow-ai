import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Client, createEmptyClient, clientToBrandProfile, OnboardingChecklist } from '../lib/client-types';
import {
  loadClients, saveClient, deleteClient as deleteClientFromStore,
  getActiveClientId, setActiveClientId, clearActiveClientId,
  migrateBrandProfilesToClients, getActiveClient,
} from '../lib/client-store';
import { BrandProfile } from '@/lib/brand-memory';
import { onClientCreated, onOnboardingCompleted, onClientActivated } from '@/services/automation';
import { getOnboardingCompletion, isOnboardingComplete } from '@/lib/client-memory';

interface ClientContextType {
  clients: Client[];
  activeClient: Client | null;
  activeClientBrandProfile: BrandProfile | null;
  setActiveClient: (client: Client | null) => void;
  createClient: (client: Client) => Promise<Client>;
  updateClient: (client: Client) => Promise<void>;
  updateClientStatus: (clientId: string, status: Client['status']) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  refreshClients: () => Promise<void>;
  updateOnboardingChecklist: (clientId: string, item: keyof OnboardingChecklist, value: boolean) => void;
  updateOnboardingNotes: (clientId: string, notes: string) => void;
  getOnboardingCompletion: (clientId: string) => number;
  migrationResult: { migrated: number; skipped: number } | null;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export function ClientProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>(() => {
    console.log('[CLIENT CONTEXT] Initializing state from localStorage...');
    const loaded = loadClients();
    console.log(`[CLIENT CONTEXT] Initial state: ${loaded.length} clients`);
    return loaded;
  });
  const [activeClient, setActiveClientState] = useState<Client | null>(() => {
    const activeId = getActiveClientId();
    if (!activeId) return null;
    const allClients = loadClients();
    const active = allClients.find(c => c.id === activeId) ?? null;
    console.log('[CLIENT CONTEXT] Initial active client:', active?.name || 'null');
    return active;
  });
  const [migrationResult, setMigrationResult] = useState<{ migrated: number; skipped: number } | null>(null);
  const { dismiss: dismissToast } = useToast();

  const refreshClients = useCallback((): Promise<void> => {
    console.log('[CLIENT CONTEXT] === REFRESH START ===');
    
    return new Promise((resolve) => {
      try {
        const all = loadClients();
        console.log(`[CLIENT CONTEXT] Loaded ${all.length} clients from store`);
        console.log('[CLIENT CONTEXT] Setting clients state:', all.map(c => ({ id: c.id, name: c.name })));
        
        setClients(prevClients => {
          console.log(`[CLIENT CONTEXT] Previous state: ${prevClients.length} clients`);
          console.log(`[CLIENT CONTEXT] New state: ${all.length} clients`);
          
          // Safety check: Don't wipe state with empty array if we had data before
          if (all.length === 0 && prevClients.length > 0) {
            console.warn('[CLIENT CONTEXT] WARNING: localStorage returned empty but previous state had data. Keeping previous state.');
            return prevClients;
          }
          
          return all;
        });

        const activeId = getActiveClientId();
        const active = activeId ? all.find(c => c.id === activeId) ?? null : null;
        setActiveClientState(active);
        console.log('[CLIENT CONTEXT] Active client set to:', active?.name || 'null');
        
        // Use requestAnimationFrame to ensure state update is processed
        requestAnimationFrame(() => {
          console.log('[CLIENT CONTEXT] === REFRESH COMPLETE ===');
          resolve();
        });
      } catch (error) {
        console.error('[CLIENT CONTEXT] Failed to refresh clients:', error);
        // Fallback: keep existing state, don't wipe UI
        console.warn('[CLIENT CONTEXT] Keeping previous state due to load error');
        requestAnimationFrame(() => resolve());
      }
    });
  }, []);

  useEffect(() => {
    console.log('[CLIENT CONTEXT] Running migration check...');
    const result = migrateBrandProfilesToClients();
    if (result.migrated > 0) {
      console.log(`[CLIENT CONTEXT] Migration completed: ${result.migrated} migrated, ${result.skipped} skipped`);
      setMigrationResult(result);
    }
    console.log('[CLIENT CONTEXT] Initial refresh...');
    refreshClients();
  }, [refreshClients]);

  // Log whenever clients state changes
  useEffect(() => {
    console.log('[CLIENT CONTEXT] clients state after setClients:', clients);
    console.log('[CLIENT CONTEXT STATE CHANGE] Clients updated:', {
      count: clients.length,
      clients: clients.map(c => ({ id: c.id, name: c.name, status: c.status })),
    });
  }, [clients]);

  const setActiveClient = useCallback((client: Client | null) => {
    if (client) {
      setActiveClientId(client.id);
      onClientActivated(client);
    } else {
      clearActiveClientId();
    }
    // Clear all toasts to prevent stale notifications referencing old client
    dismissToast();
    setActiveClientState(client);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createClient = useCallback(async (client: Client): Promise<Client> => {
    console.log('[CLIENT FLOW] Before create - Starting client creation');
    console.log('[CLIENT CONTEXT] Creating client:', client);
    
    try {
      saveClient(client);
      console.log(`[CLIENT_CONTEXT] CLIENT SAVED: "${client.name}" ID: ${client.id}`);
      
      // Verification
      const verify = loadClients().find(c => c.id === client.id);
      if (!verify) console.error('[CLIENT_CONTEXT] FATAL ERROR: Client not found in store immediately after save! Likely Zod check failure.');
      else console.log('[CLIENT_CONTEXT] Client Persistence Verification: SUCCESS');

      onClientCreated(client);
      await refreshClients();
      return client;
    } catch (error) {
      console.error('[CLIENT CONTEXT] Failed to create client:', error);
      throw error;
    }
  }, [refreshClients]);

  const updateClient = useCallback(async (client: Client): Promise<void> => {
    console.log('[CLIENT FLOW] Before update - Starting client update');
    try {
      const all = loadClients();
      const prev = all.find(c => c.id === client.id);
      const wasComplete = prev ? isOnboardingComplete(prev.onboardingChecklist) : false;
      const isNowComplete = isOnboardingComplete(client.onboardingChecklist);

      saveClient(client);
      console.log('[CLIENT FLOW] After save - Client saved to localStorage');
      
      await refreshClients();
      console.log('[CLIENT FLOW] After refresh - State updated and rendered');
      
      if (!wasComplete && isNowComplete) {
        onOnboardingCompleted(client);
      }
      
      console.log('[CLIENT CONTEXT] Client updated successfully:', client.name);
    } catch (error) {
      console.error('[CLIENT CONTEXT] Failed to update client:', error);
      throw error;
    }
  }, [refreshClients]);

  const deleteClient = useCallback(async (id: string): Promise<void> => {
    console.log('[CLIENT FLOW] Before delete - Starting client deletion');
    
    // Explicitly clear active client if we are deleting it
    if (activeClient?.id === id) {
      setActiveClientState(null);
      clearActiveClientId();
      console.log('[CLIENT FLOW] Cleared active client before deletion');
    }

    deleteClientFromStore(id);
    console.log('[CLIENT FLOW] After delete - Client removed from localStorage');
    
    await refreshClients();
    console.log('[CLIENT FLOW] After refresh - State updated and rendered');
  }, [activeClient, refreshClients]);

  const updateClientStatus = useCallback(async (clientId: string, status: Client['status']): Promise<void> => {
    console.log(`[CLIENT FLOW] Before status update - Updating client ${clientId} to ${status}`);
    console.log(`[CLIENT CONTEXT] Updating status for client ${clientId} to ${status}`);
    const allClients = loadClients();
    const clientIndex = allClients.findIndex(c => c.id === clientId);
    
    if (clientIndex === -1) {
      console.error(`[CLIENT CONTEXT] Client ${clientId} not found`);
      return;
    }
    
    allClients[clientIndex] = {
      ...allClients[clientIndex],
      status,
      updatedAt: new Date().toISOString(),
    };
    
    // Save entire array at once (not individually)
    console.log(`[CLIENT FLOW] After status change - Saving updated clients array (${allClients.length} clients)`);
    console.log(`[CLIENT CONTEXT] Saving updated clients array (${allClients.length} clients)`);
    try {
      localStorage.setItem('socialidiots_clients', JSON.stringify(allClients));
      console.log('[CLIENT FLOW] After save - Status update saved to localStorage');
      console.log('[CLIENT CONTEXT] Status update saved successfully');
    } catch (error) {
      console.error('[CLIENT CONTEXT] Failed to save status update:', error);
      throw error;
    }
    
    await refreshClients();
    console.log('[CLIENT FLOW] After refresh - State updated and rendered');
  }, [refreshClients]);

  const updateOnboardingChecklist = useCallback((clientId: string, item: keyof OnboardingChecklist, value: boolean) => {
    const client = loadClients().find(c => c.id === clientId);
    if (!client) return;

    const wasComplete = isOnboardingComplete(client.onboardingChecklist);
    const updatedChecklist = { ...client.onboardingChecklist, [item]: value };
    const isNowComplete = isOnboardingComplete(updatedChecklist);

    // Calculate progress for status transitions
    const completedCount = Object.values(updatedChecklist).filter(Boolean).length;
    const totalCount = Object.keys(updatedChecklist).length;
    const progress = Math.round((completedCount / totalCount) * 100);

    let newStatus = client.status;
    if (progress >= 70) {
      newStatus = 'active';
    } else if (progress > 0) {
      newStatus = 'onboarding';
    } else {
      newStatus = 'lead';
    }

    const updatedClient: Client = {
      ...client,
      onboardingChecklist: updatedChecklist,
      onboardingStatus: isNowComplete ? 'completed' : 'in_progress',
      onboardingCompletedAt: isNowComplete ? new Date().toISOString() : null,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    saveClient(updatedClient);
    refreshClients();

    if (!wasComplete && isNowComplete) {
      onOnboardingCompleted(updatedClient);
    }
  }, [refreshClients]);

  const updateOnboardingNotes = useCallback((clientId: string, notes: string) => {
    const client = loadClients().find(c => c.id === clientId);
    if (!client) return;

    const updatedClient: Client = {
      ...client,
      onboardingNotes: notes,
    };

    saveClient(updatedClient);
    refreshClients();
  }, [refreshClients]);

  const getOnboardingCompletionForClient = useCallback((clientId: string): number => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return 0;
    return getOnboardingCompletion(client.onboardingChecklist);
  }, [clients]);

  const activeClientBrandProfile = activeClient
    ? clientToBrandProfile(activeClient)
    : null;

  return (
    <ClientContext.Provider value={{
      clients,
      activeClient,
      activeClientBrandProfile,
      setActiveClient,
      createClient,
      updateClient,
      updateClientStatus,
      deleteClient,
      refreshClients,
      updateOnboardingChecklist,
      updateOnboardingNotes,
      getOnboardingCompletion: getOnboardingCompletionForClient,
      migrationResult,
    }}>
      {children}
    </ClientContext.Provider>
  );
}

export function useClients() {
  const context = useContext(ClientContext);
  if (context === undefined) {
    throw new Error('useClients must be used within a ClientProvider');
  }
  return context;
}
