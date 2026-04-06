import { generateId } from '@/lib/utils';
import { Client, createEmptyClient } from '../lib/client-types';
import { saveClient, loadClients } from './client-store';

export interface SheetRow {
  name?: string;
  email?: string;
  phone?: string;
  brandName?: string;
  niche?: string;
  [key: string]: any; // Allow additional fields
}

export interface ImportResult {
  added: number;
  skipped: number;
  errors: string[];
  clients: Client[];
}

/**
 * Import clients from Google Sheets rows (simulated)
 * Prevents duplicates via email matching
 */
export function importClientsFromSheet(rows: SheetRow[]): ImportResult {
  const existingClients = loadClients();
  // Check emails in both contacts and clientProfile
  const existingEmails = new Set(
    existingClients.flatMap(c => [
      c.clientProfile.email,
      ...c.contacts.map(contact => contact.email),
    ]).filter(Boolean).map(e => e!.toLowerCase())
  );
  
  const result: ImportResult = {
    added: 0,
    skipped: 0,
    errors: [],
    clients: [],
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    try {
      // Validate required field
      if (!row.email || !row.email.trim()) {
        result.errors.push(`Row ${rowNum}: Missing email`);
        result.skipped++;
        continue;
      }

      const email = row.email.trim().toLowerCase();

      // Check for duplicates
      if (existingEmails.has(email)) {
        result.skipped++;
        continue;
      }

      // Create new client
      const client = createEmptyClient();
      client.name = row.name?.trim() || row.brandName?.trim() || `Client ${Date.now()}`;
      client.status = 'lead'; // All imported clients start as leads
      
      // Set brand profile data
      if (row.brandName) {
        client.brandProfile.brandName = row.brandName.trim();
      }
      if (row.niche) {
        client.brandProfile.niche = row.niche.trim();
        client.niche = row.niche.trim();
      }
      
      // Set client profile with contact info
      client.clientProfile.email = email;
      client.clientProfile.brandName = row.brandName?.trim() || client.name;
      client.clientProfile.industry = row.niche?.trim() || '';
      client.clientProfile.contactNumber = row.phone?.trim() || '';
      
      // Add primary contact
      client.contacts.push({
        id: generateId(),
        name: row.name?.trim() || client.name,
        email: email,
        role: 'approver',
      });

      // Save client
      saveClient(client);
      result.clients.push(client);
      result.added++;
      existingEmails.add(email);

    } catch (error) {
      result.errors.push(`Row ${rowNum}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.skipped++;
    }
  }

  return result;
}

/**
 * Mock data fetch from Google Sheets (simulates API call)
 * Replace this with real Google Sheets API integration later
 */
export async function fetchClientsFromSheets(sheetId: string): Promise<SheetRow[]> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  // Mock data - replace with actual Google Sheets API call
  return [
    {
      name: 'Sarah Johnson',
      email: 'sarah@fitlife.com',
      phone: '+1-555-0123',
      brandName: 'FitLife Gym',
      niche: 'Fitness',
    },
    {
      name: 'Mike Chen',
      email: 'mike@techstartup.io',
      phone: '+1-555-0456',
      brandName: 'TechFlow',
      niche: 'Technology',
    },
    {
      name: 'Emma Davis',
      email: 'emma@beautybrand.com',
      phone: '+1-555-0789',
      brandName: 'Glow Beauty',
      niche: 'Beauty & Skincare',
    },
  ];
}

/**
 * Sync clients from Google Sheets
 * Combines fetch and import in one operation
 */
export async function syncClientsFromSheets(sheetId: string): Promise<ImportResult> {
  const rows = await fetchClientsFromSheets(sheetId);
  return importClientsFromSheet(rows);
}
