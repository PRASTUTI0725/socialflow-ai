import React from 'react';
import { useWorkflow } from '@/context/workflow-context';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, PenTool, Sparkles, LogOut, ChevronRight, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function Layout({ children }: { children: React.ReactNode }) {
  const { view, setView } = useWorkflow();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'create', label: 'Create Strategy', icon: PenTool },
    { id: 'output', label: 'Output Results', icon: Sparkles },
  ] as const;

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-sidebar-border bg-sidebar flex-shrink-0 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border/50">
          <div className="flex items-center gap-2 text-primary">
            <Zap className="w-5 h-5 fill-primary" />
            <span className="font-display font-bold text-lg text-foreground tracking-tight">SocialFlow AI</span>
          </div>
        </div>
        
        <div className="flex-1 py-6 px-3 flex flex-col gap-1">
          <div className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-2 px-3">
            Main Menu
          </div>
          {navItems.map((item) => {
            const isActive = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium w-full text-left group hover-elevate",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <item.icon className={cn("w-4 h-4", isActive ? "text-primary-foreground" : "text-sidebar-foreground/70 group-hover:text-foreground")} />
                {item.label}
                {isActive && (
                  <ChevronRight className="w-4 h-4 ml-auto opacity-70" />
                )}
              </button>
            );
          })}
        </div>

        <div className="p-4 border-t border-sidebar-border/50">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-foreground cursor-pointer transition-colors">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary/80 to-accent flex items-center justify-center text-primary-foreground shadow-sm">
              <span className="font-bold text-xs">JD</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-foreground font-semibold">Jane Doe</p>
              <p className="truncate text-xs opacity-70">jane@agency.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative h-screen overflow-hidden bg-background">
        {/* Mobile Header */}
        <header className="h-16 border-b flex items-center justify-between px-4 md:hidden bg-background/80 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-2 text-primary">
            <Zap className="w-5 h-5 fill-primary" />
            <span className="font-display font-bold text-lg text-foreground">SocialFlow AI</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => setView('dashboard')}>
              <LayoutDashboard className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setView('create')}>
              <PenTool className="w-5 h-5" />
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="min-h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
