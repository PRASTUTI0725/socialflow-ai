import React from 'react';
import { useWorkflow } from '@/context/workflow-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, BarChart3, Clock, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export function Dashboard() {
  const { setView, history } = useWorkflow();

  const stats = [
    { title: "Strategies Generated", value: history.length.toString(), icon: BarChart3, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Content Ideas Created", value: (history.length * 10).toString(), icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10" },
    { title: "Hours Saved", value: `${history.length * 3}`, icon: Clock, color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto w-full">
      <div className="mb-10">
        <h1 className="text-3xl lg:text-4xl font-display font-bold text-foreground mb-2">Welcome back, Jane 👋</h1>
        <p className="text-muted-foreground text-lg">Let's generate some high-converting content for your clients today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {stats.map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            key={i}
          >
            <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-center gap-4">
                <div className={`p-4 rounded-2xl ${stat.bg}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-display font-bold text-foreground mt-1">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-display font-bold">Recent Strategies</h2>
          </div>
          
          {history.length > 0 ? (
            <div className="space-y-4">
              {history.slice(0, 5).map((item, i) => (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + (i * 0.1) }}
                  key={item.id}
                  className="bg-card border border-border/50 rounded-2xl p-5 flex items-center justify-between shadow-sm hover:border-primary/30 transition-colors group cursor-pointer hover-elevate"
                  onClick={() => setView('output')} // In a real app this would load the specific strategy
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {item.settings.niche.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{item.settings.niche} Campaign</h3>
                      <p className="text-sm text-muted-foreground">{item.settings.platforms.join(', ')} • {item.settings.goal}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-muted/30 border border-dashed border-border/60 rounded-3xl p-12 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No strategies yet</h3>
              <p className="text-muted-foreground max-w-sm mb-6">You haven't generated any social media strategies. Create your first one to see it here.</p>
              <Button onClick={() => setView('create')} className="active-elevate-2 shadow-md shadow-primary/20">
                <Plus className="w-4 h-4 mr-2" /> Create First Strategy
              </Button>
            </div>
          )}
        </div>

        <div>
          <div className="bg-gradient-to-br from-primary to-blue-600 rounded-3xl p-8 text-white shadow-xl shadow-primary/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
            <div className="relative z-10">
              <Sparkles className="w-10 h-10 mb-6 text-white/90" />
              <h3 className="text-2xl font-display font-bold mb-3">Ready to create?</h3>
              <p className="text-primary-foreground/80 mb-8 leading-relaxed">
                Generate 30 days of high-converting content, hooks, and captions in less than 2 minutes.
              </p>
              <Button 
                onClick={() => setView('create')} 
                className="w-full bg-white text-primary hover:bg-white/90 active-elevate-2 font-semibold text-lg py-6"
              >
                Start Workflow <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
