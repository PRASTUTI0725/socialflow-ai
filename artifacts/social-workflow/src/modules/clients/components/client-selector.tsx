import React from 'react';
import { useClients } from '../context/client-context';
import { Client } from '../lib/client-types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Users, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ClientSelector() {
  const { clients, activeClient, setActiveClient } = useClients();

  const activeClients = clients.filter(c => c.status === 'active');
  const leadClients = clients.filter(c => c.status === 'lead');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between h-10 rounded-xl text-sm font-medium"
          aria-label="Select client"
        >
          <span className="flex items-center gap-2 truncate">
            {activeClient ? (
              <>
                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-primary">{activeClient.name.charAt(0)}</span>
                </div>
                <span className="truncate" title={activeClient.name}>{activeClient.name}</span>
              </>
            ) : (
              <>
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">No client selected</span>
              </>
            )}
          </span>
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="start">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Switch Client</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {activeClients.length === 0 && leadClients.length === 0 && (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            No clients yet. Create one in Client Insights.
          </div>
        )}

        {activeClients.map(client => (
          <DropdownMenuItem
            key={client.id}
            onClick={() => setActiveClient(client)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-primary">{client.name.charAt(0)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" title={client.name}>{client.name}</p>
              <p className="text-xs text-muted-foreground truncate">{client.niche}</p>
            </div>
            {activeClient?.id === client.id && (
              <Check className="w-4 h-4 text-primary shrink-0" />
            )}
          </DropdownMenuItem>
        ))}

        {leadClients.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">Leads</DropdownMenuLabel>
            {leadClients.map(client => (
              <DropdownMenuItem
                key={client.id}
                onClick={() => setActiveClient(client)}
                className="flex items-center gap-2 cursor-pointer opacity-60"
              >
                <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-muted-foreground">{client.name.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" title={client.name}>{client.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{client.niche}</p>
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}

        {activeClient && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setActiveClient(null)}
              className="text-muted-foreground cursor-pointer"
            >
              Clear selection
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
