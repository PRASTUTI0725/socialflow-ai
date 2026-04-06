import React, { useEffect, useState } from 'react';
import { Client } from '../lib/client-types';
import { ClientList } from '../components/client-list';
import { ClientOnboardingForm } from '../components/client-onboarding-form';
import { ClientDetail } from '../components/client-detail';
import { useClients } from '../context/client-context';
import { Button } from '@/components/ui/button';
import { Users, Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useWorkflow } from '@/context/workflow-context';

export function ClientsPage() {
  const { clients, activeClient } = useClients();
  const { onboardingEditingSection, setOnboardingEditingSection } = useWorkflow();
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const pageTopRef = React.useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!onboardingEditingSection || !activeClient) return;
    if (isCreating) return;
    setEditingClient(activeClient);
    setViewingClient(null);
    setIsCreating(false);
  }, [onboardingEditingSection, activeClient, isCreating]);

  const handleSelect = (client: Client) => {
    setViewingClient(client);
    setIsCreating(false);
    setEditingClient(null);
  };

  const handleNew = () => {
    // Console-safe guard: if an edit is already in progress, force clear first.
    if (editingClient) setEditingClient(null);
    setOnboardingEditingSection(null);
    setViewingClient(null);
    setIsCreating(true);

    // Reset scroll/focus to top so the form always feels "fresh".
    requestAnimationFrame(() => {
      pageTopRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
      setTimeout(() => {
        const firstInput = document.querySelector('input') as HTMLInputElement | null;
        firstInput?.focus?.();
      }, 50);
    });
  };

  const handleEdit = () => {
    if (viewingClient) {
      setEditingClient(viewingClient);
      setViewingClient(null);
    }
  };

  const handleBack = () => {
    setViewingClient(null);
    setEditingClient(null);
    setIsCreating(false);
    setOnboardingEditingSection(null);
  };

  const handleFormComplete = () => {
    setIsCreating(false);
    setEditingClient(null);
    setOnboardingEditingSection(null);
  };

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto w-full pb-32" ref={pageTopRef}>
      {/* Page Header */}
      {!viewingClient && !editingClient && (
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-3xl lg:text-4xl font-display font-bold text-foreground">Clients</h1>
            </div>
            <p className="text-muted-foreground text-lg">
              Manage your client profiles — each client gets tailored content strategies.
            </p>
          </div>
          {!isCreating && (
            <Button onClick={handleNew} className="shrink-0 rounded-xl shadow-md shadow-primary/20 gap-2">
              <Plus className="w-4 h-4" /> Add Client
            </Button>
          )}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* Client Detail */}
        {viewingClient && !editingClient && (
          <ClientDetail
            key="detail"
            client={viewingClient}
            onEdit={handleEdit}
            onBack={handleBack}
          />
        )}

        {/* Create / Edit Form */}
        {(isCreating || editingClient) && (
          <motion.div key="form" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <ClientOnboardingForm
              key={editingClient?.id ?? (isCreating ? 'new-client' : 'edit')}
              existingClient={editingClient}
              onComplete={handleFormComplete}
              onCancel={handleBack}
              targetSection={onboardingEditingSection}
            />
          </motion.div>
        )}

        {/* Client List */}
        {!viewingClient && !isCreating && !editingClient && (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ClientList onSelect={handleSelect} onNew={handleNew} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
