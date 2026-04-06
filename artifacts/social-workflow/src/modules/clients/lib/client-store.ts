import { z } from 'zod';
import { generateId } from '@/lib/utils';
import {
  Client,
  createEmptyClient,
  createEmptyClientProfile,
  createDefaultOnboardingChecklist,
  deriveClientProfileFromClient,
  deriveOnboardingChecklistFromProfile,
  hasMeaningfulClientProfile,
} from './client-types';
import { validateClients, ClientSchema } from './client-validation';
import { BrandProfile, loadProfiles, getActiveProfileId } from '@/lib/brand-memory';

const CLIENTS_STORAGE_KEY = 'socialidiots_clients';
const ACTIVE_CLIENT_KEY = 'socialidiots_active_client';
const MIGRATION_FLAG_KEY = 'socialidiots_migration_done';

function ensureOnboardingFields(client: Record<string, unknown>): Client {
  if (!client.status) {
    client.status = 'lead';
  }
  if (!client.onboardingStatus) {
    client.onboardingStatus = 'not_started';
  }
  if (!client.onboardingChecklist) {
    client.onboardingChecklist = createDefaultOnboardingChecklist();
  }
  if (!client.onboardingNotes) {
    client.onboardingNotes = '';
  }
  if (!client.onboardingCompletedAt) {
    client.onboardingCompletedAt = null;
  }
  const typed = client as unknown as Client;
  if (!typed.clientProfile) {
    typed.clientProfile = createEmptyClientProfile();
  }
  if (!hasMeaningfulClientProfile(typed.clientProfile)) {
    typed.clientProfile = deriveClientProfileFromClient(typed);
  }
  typed.businessName = typed.businessName || typed.clientProfile.brandName || typed.brandProfile.brandName || typed.name;
  typed.niche = typed.clientProfile.industry || typed.niche || typed.brandProfile.niche;
  typed.metadata = {
    ...typed.metadata,
    platforms: typed.clientProfile.platforms,
    contentPillars: typed.clientProfile.contentPreferences,
  };
  typed.brandProfile = {
    ...typed.brandProfile,
    brandName: typed.businessName,
    niche: typed.niche,
    targetAudience: typed.clientProfile.targetAudience,
    tone: typed.clientProfile.brandVoice || typed.brandProfile.tone,
    pastContent: typed.clientProfile.messaging,
    keywords: typed.clientProfile.goals,
    themes: typed.clientProfile.contentPreferences,
  };
  typed.onboardingChecklist = deriveOnboardingChecklistFromProfile(typed.clientProfile);
  return typed;
}

export function loadClients(): Client[] {
  try {
    console.log('[CLIENT STORE] Attempting to load clients from localStorage...');
    const raw = localStorage.getItem(CLIENTS_STORAGE_KEY);
    if (!raw) {
      console.log('[CLIENT STORE] No data found in localStorage (key:', CLIENTS_STORAGE_KEY + ')');
      return [];
    }
    
    console.log(`[CLIENT STORE] Raw LocalStorage Data:`, raw.substring(0, 500) + (raw.length > 500 ? '...' : ''));
    const parsed = JSON.parse(raw);
    console.log(`[CLIENT STORE] Parsed Array:`, parsed);
    
    if (!Array.isArray(parsed)) {
      console.error('[CLIENT STORE] WARNING: Parsed data is not an array!', typeof parsed);
      return [];
    }
    
    try {
      const results = parsed.map(c => {
        try {
          const validated = ClientSchema.parse(c);
          return ensureOnboardingFields(validated as unknown as Record<string, unknown>);
        } catch (e) {
          console.error('[CLIENT STORE] Validation failed for client:', c?.id || 'unknown', e instanceof z.ZodError ? e.errors : e);
          return null;
        }
      }).filter(Boolean) as Client[];
      
      console.log(`[CLIENT STORE] Successfully loaded and validated ${results.length} clients`);
      return results;
    } catch (validationError) {
      console.error('[CLIENT STORE] Catastrophic array validation failure:', validationError);
      return [];
    }
  } catch (error) {
    console.error('[CLIENT STORE] CRITICAL ERROR loading clients:', error);
    console.error('[CLIENT STORE] Error details:', error instanceof Error ? error.message : String(error));
    // Return empty array on failure - context will handle fallback
    return [];
  }
}

function saveClients(clients: Client[]): void {
  try {
    console.log(`[CLIENT STORE] Saving ${clients.length} clients to localStorage...`);
    localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients));
    console.log('[CLIENT STORE] Save successful');
  } catch (error) {
    console.error('[CLIENT STORE] Failed to save clients to localStorage:', error);
    throw error;
  }
}

export function getClient(id: string): Client | null {
  const clients = loadClients();
  return clients.find(c => c.id === id) ?? null;
}

export function saveClient(client: Client): void {
  try {
    console.log('[CLIENT STORE] === SAVE START ===');
    console.log('[CLIENT STORE] Client to save:', JSON.stringify(client, null, 2));
    
    const clients = loadClients();
    console.log(`[CLIENT STORE] Existing clients count: ${clients.length}`);
    
    const idx = clients.findIndex(c => c.id === client.id);
    const profile = hasMeaningfulClientProfile(client.clientProfile)
      ? client.clientProfile
      : deriveClientProfileFromClient(client);
    const businessName = client.businessName || profile.brandName || client.brandProfile.brandName || client.name;
    const niche = profile.industry || client.niche || client.brandProfile.niche;

    const normalized: Client = {
      ...client,
      businessName,
      niche,
      clientProfile: {
        ...profile,
        name: client.name,
        brandName: businessName,
        industry: niche,
      },
      metadata: {
        ...client.metadata,
        platforms: profile.platforms,
        contentPillars: profile.contentPreferences,
      },
      brandProfile: {
        ...client.brandProfile,
        brandName: businessName,
        niche,
        targetAudience: profile.targetAudience,
        tone: profile.brandVoice || client.brandProfile.tone,
        pastContent: profile.messaging,
        keywords: profile.goals,
        themes: profile.contentPreferences,
      },
      onboardingChecklist: deriveOnboardingChecklistFromProfile(profile),
    };
    
    if (idx >= 0) {
      console.log(`[CLIENT STORE] Updating existing client at index ${idx}: ${client.name} (${client.id})`);
      clients[idx] = normalized;
    } else {
      console.log(`[CLIENT STORE] Adding new client: ${client.name} (${client.id})`);
      clients.push(normalized);
    }
    
    console.log(`[CLIENT STORE] Total clients after operation: ${clients.length}`);
    console.log('[CLIENT STORE] Final array being saved to localStorage:', clients);
    saveClients(clients);
    console.log('[CLIENT STORE] === SAVE COMPLETE ===');
  } catch (error) {
    console.error('[CLIENT STORE] Failed to save client:', error);
    throw error;
  }
}

export function deleteClient(id: string): void {
  const clients = loadClients().filter(c => c.id !== id);
  saveClients(clients);
  if (getActiveClientId() === id) {
    clearActiveClientId();
  }
}

export function updateClientStatus(id: string, status: Client['status']): void {
  const clients = loadClients();
  const client = clients.find(c => c.id === id);
  if (client) {
    client.status = status;
    saveClients(clients);
  }
}

// --- Active Client ---

export function getActiveClientId(): string | null {
  return localStorage.getItem(ACTIVE_CLIENT_KEY);
}

export function setActiveClientId(id: string | null): void {
  if (id) {
    localStorage.setItem(ACTIVE_CLIENT_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_CLIENT_KEY);
  }
}

export function clearActiveClientId(): void {
  localStorage.removeItem(ACTIVE_CLIENT_KEY);
}

// --- Migration from Brand Profiles ---

export function migrateBrandProfilesToClients(): { migrated: number; skipped: number } {
  if (localStorage.getItem(MIGRATION_FLAG_KEY) === 'done') {
    return { migrated: 0, skipped: 0 };
  }

  const profiles = loadProfiles();
  const existingClients = loadClients();
  const existingClientNames = new Set(existingClients.map(c => c.name.toLowerCase()));

  let migrated = 0;
  let skipped = 0;

  for (const profile of profiles) {
    const clientName = profile.brandName || `Client ${profile.id}`;

    // Skip if a client with this name already exists
    if (existingClientNames.has(clientName.toLowerCase())) {
      skipped++;
      continue;
    }

    const client: Client = {
      id: generateId(),
      name: clientName,
      businessName: clientName,
      niche: profile.niche,
      status: 'active',
      strategyStatus: 'draft',
      brandProfile: { ...profile },
      contacts: [],
      metadata: {
        platforms: [],
        postingFrequency: '',
        contentPillars: [],
      },
      brandIntelligence: {
        preferredHookStyle: 'mixed',
        preferredTonePatterns: [],
        avoidedWords: [],
        highPerformingThemes: [],
        contentStyleNotes: '',
        ctaPatterns: [],
        commonWords: [],
        lastAnalyzed: null,
        patternScores: { themes: {}, hookTypes: {}, tonePatterns: {} },
        refinementCount: 0,
        approvalCount: 0,
        rejectionCount: 0,
        editCount: 0,
      },
      rawFormData: null,
      strategy: null,
      strategies: [],
      createdAt: profile.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      onboardingStatus: 'not_started',
      onboardingChecklist: createDefaultOnboardingChecklist(),
      onboardingNotes: '',
      onboardingCompletedAt: null,
      clientProfile: createEmptyClientProfile(),
      selectedPlan: '',
      monthlyPrice: 0,
      servicesIncluded: [],
      internalNotes: '',
    };

    client.clientProfile = deriveClientProfileFromClient(client);
    existingClients.push(client);
    migrated++;
  }

  if (migrated > 0) {
    saveClients(existingClients);
  }

  // Migrate active profile → active client
  const activeProfileId = getActiveProfileId();
  if (activeProfileId) {
    const migratedClient = existingClients.find(c => c.brandProfile.id === activeProfileId);
    if (migratedClient) {
      setActiveClientId(migratedClient.id);
    }
  }

  localStorage.setItem(MIGRATION_FLAG_KEY, 'done');
  return { migrated, skipped };
}

// --- Lookup helpers ---

export function getClientByBrandProfileId(profileId: string): Client | null {
  return loadClients().find(c => c.brandProfile.id === profileId) ?? null;
}

export function getActiveClient(): Client | null {
  const activeId = getActiveClientId();
  if (!activeId) return null;
  return getClient(activeId);
}
