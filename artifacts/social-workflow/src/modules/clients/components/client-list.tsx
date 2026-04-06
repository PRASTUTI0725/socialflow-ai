import React, { useState } from 'react';
import { useClients } from '../context/client-context';
import { Client, ClientStatus, calculateOnboardingProgress } from '../lib/client-types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, ArrowRight, CheckCircle2, XCircle, Circle, Eye, EyeOff, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ImportClientsDialog } from './import-clients-dialog';

interface ClientListProps {
  onSelect: (client: Client) => void;
  onNew: () => void;
}

export function ClientList({ onSelect, onNew }: ClientListProps) {
  const { clients, activeClient, setActiveClient, deleteClient } = useClients();
  const visibleClients = clients; // Simple for now


  const statusIcon: Record<ClientStatus, React.ReactNode> = {
    lead: <Circle className="w-3.5 h-3.5 text-blue-500 fill-blue-500/20" />,
    onboarding: <Circle className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />,
    active: <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />,
    paused: <Circle className="w-3.5 h-3.5 text-slate-500" />,
    completed: <CheckCircle2 className="w-3.5 h-3.5 text-violet-500" />,
  };

  const statusLabel: Record<ClientStatus, string> = {
    lead: 'Lead',
    onboarding: 'Onboarding',
    active: 'Active',
    paused: 'Paused',
    completed: 'Completed',
  };

  const calculateProgress = (client: Client) => {
    return calculateOnboardingProgress(client);
  };

  return (
    <div className="space-y-6">

      {clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6">
            <Users className="w-10 h-10 text-primary/60" />
          </div>
          <h3 className="text-xl font-display font-bold mb-2">No clients yet</h3>
          <p className="text-muted-foreground max-w-sm mb-8">
            Add your first client to start generating tailored content strategies.
          </p>
          <Button onClick={onNew} className="gap-2 rounded-xl shadow-md shadow-primary/20">
            <Plus className="w-4 h-4" /> Add First Client
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-bold">All Clients</h2>
            <div className="flex gap-2">
              <ImportClientsDialog />
              <Button onClick={onNew} className="gap-2 rounded-xl shadow-md shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="w-4 h-4" /> Add Client
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {visibleClients.map((client, i) => {
              const progress = calculateProgress(client);
              return (
                <motion.div
                  key={client.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card
                    className={cn(
                      "border transition-all cursor-pointer h-full flex flex-col hover:shadow-lg hover:border-primary/30",
                      activeClient?.id === client.id
                        ? "border-2 border-green-500 shadow-md ring-4 ring-green-500/10 bg-green-50/30 dark:bg-green-900/10"
                        : "border-border/60 bg-card"
                    )}
                    onClick={() => onSelect(client)}
                  >
                    <CardContent className="p-5 flex flex-col h-full">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-violet-500/10 flex items-center justify-center shrink-0">
                            <span className="font-display font-bold text-sm text-primary">
                              {(client.businessName || client.name).charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-display font-bold text-foreground leading-tight truncate" title={client.businessName || client.name}>{client.businessName || client.name}</h3>
                            <p className="text-xs text-muted-foreground truncate">{client.name} · {client.niche || 'No niche set'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-col">
                          {activeClient?.id === client.id && (
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs mb-1">Active</Badge>
                          )}
                          {client.onboardingStatus === 'completed' ? (
                            <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px]">Ready</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/50">Details</Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/50">
                          {statusIcon[client.status]}
                          {statusLabel[client.status]}
                        </span>
                        {client.metadata.platforms.slice(0, 2).map(p => (
                          <span key={p} className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/50">
                            {p}
                          </span>
                        ))}
                        {client.metadata.platforms.length > 2 && (
                          <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/50">
                            +{client.metadata.platforms.length - 2}
                          </span>
                        )}
                      </div>

                      {/* Onboarding Progress UI */}
                      <div className="my-3 space-y-1.5">
                        <div className="flex justify-between items-center text-xs mb-1">
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-border/50 bg-background/50">
                            {progress <= 30 && (
                              <>
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-red-600 font-bold text-[10px] uppercase tracking-wider">Incomplete</span>
                              </>
                            )}
                            {progress > 30 && progress <= 70 && (
                              <>
                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                                <span className="text-amber-600 font-bold text-[10px] uppercase tracking-wider">Needs Improvement</span>
                              </>
                            )}
                            {progress > 70 && (
                              <>
                                <span className="w-2 h-2 rounded-full bg-green-500" />
                                <span className="text-green-600 font-bold text-[10px] uppercase tracking-wider">Ready</span>
                              </>
                            )}
                          </div>
                          <span className="text-muted-foreground/60 text-[10px] italic">Completed: {progress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              progress <= 30 ? "bg-red-500" : progress <= 70 ? "bg-amber-500" : "bg-green-500"
                            )} 
                            style={{ width: `${progress}%` }} 
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-3 border-t border-border/40 mt-auto" onClick={e => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant={activeClient?.id === client.id ? "secondary" : "outline"}
                          className={cn(
                            "flex-1 rounded-xl h-8 text-xs shrink-0 transition-all font-semibold",
                            activeClient?.id === client.id 
                              ? "bg-green-50 text-green-600 border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:border-green-800"
                              : "text-muted-foreground border-border/60 hover:bg-muted/50 hover:text-foreground"
                          )}
                          onClick={() => setActiveClient(client)}
                          disabled={activeClient?.id === client.id}
                        >
                          {activeClient?.id === client.id ? (
                            <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-green-500 fill-green-500/10" /> Active</>
                          ) : (
                            "Set Active"
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-xl h-8 text-xs"
                          onClick={() => onSelect(client)}
                        >
                          View <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-xl h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/5 p-0"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete ${client.businessName || client.name}?`)) {
                              deleteClient(client.id);
                            }
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>


        </>
      )}

    </div>
  );
}
