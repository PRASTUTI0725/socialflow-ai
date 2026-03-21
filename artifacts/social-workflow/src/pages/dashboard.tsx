import React from 'react';
import { useWorkflow } from '@/context/workflow-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, BarChart3, Clock, CheckCircle2, ArrowRight, Sparkles, TrendingUp, Users, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

export function Dashboard() {
  const { setView, history, viewMode } = useWorkflow();

  const stats = [
    { title: "Strategies Generated", value: history.length.toString(), icon: BarChart3, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Content Ideas Created", value: (history.length * 10).toString(), icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10" },
    { title: "Hours Saved", value: `${history.length * 3}`, icon: Clock, color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  if (viewMode === 'client') {
    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    
    return (
      <div className="p-6 lg:p-10 max-w-6xl mx-auto w-full">
        <div className="mb-10">
          <h1 className="text-3xl lg:text-4xl font-display font-bold text-foreground mb-2">Client Report — {currentMonth}</h1>
          <p className="text-muted-foreground text-lg">Your monthly performance and social growth summary.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground mb-1">Followers Growth</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-display font-bold text-foreground">+1,247</p>
                <span className="text-sm font-medium text-green-500 flex items-center"><ArrowUpRight className="w-3 h-3 mr-0.5" /> 12.4%</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground mb-1">Engagement Rate</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-display font-bold text-foreground">4.8%</p>
                <span className="text-sm font-medium text-green-500 flex items-center"><ArrowUpRight className="w-3 h-3 mr-0.5" /> 0.6%</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground mb-1">Total Reach</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-display font-bold text-foreground">89.2K</p>
                <span className="text-sm font-medium text-green-500 flex items-center"><ArrowUpRight className="w-3 h-3 mr-0.5" /> 8.1%</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground mb-1">Content Published</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-display font-bold text-foreground">18 <span className="text-lg text-muted-foreground font-normal">posts</span></p>
                <span className="text-sm font-medium text-blue-500 flex items-center">on track</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" /> Before vs After
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-8 mt-4">
                <div className="space-y-4">
                  <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Previous Month</div>
                  <div>
                    <p className="text-sm text-muted-foreground">Followers</p>
                    <p className="text-xl font-bold">9,840</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Engagement</p>
                    <p className="text-xl font-bold">3.2%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reach</p>
                    <p className="text-xl font-bold">42.0K</p>
                  </div>
                </div>
                <div className="space-y-4 border-l border-border pl-8">
                  <div className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Current Month</div>
                  <div>
                    <p className="text-sm text-muted-foreground">Followers</p>
                    <p className="text-xl font-bold text-foreground flex items-center gap-2">11,087 <ArrowUpRight className="w-4 h-4 text-green-500" /></p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Engagement</p>
                    <p className="text-xl font-bold text-foreground flex items-center gap-2">4.8% <ArrowUpRight className="w-4 h-4 text-green-500" /></p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reach</p>
                    <p className="text-xl font-bold text-foreground flex items-center gap-2">89.2K <ArrowUpRight className="w-4 h-4 text-green-500" /></p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-8">
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Weekly Follower Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-4 h-40 mt-4 px-2">
                  {[
                    { val: 800, max: 1500, label: 'W1' },
                    { val: 1200, max: 1500, label: 'W2' },
                    { val: 950, max: 1500, label: 'W3' },
                    { val: 1247, max: 1500, label: 'W4' }
                  ].map((item, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                      <div className="w-full bg-primary/20 rounded-t-md hover:bg-primary transition-colors relative" style={{ height: `${(item.val/item.max)*100}%` }}>
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-foreground text-background text-xs py-1 px-2 rounded font-medium transition-opacity">
                          +{item.val}
                        </div>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm bg-gradient-to-r from-card to-primary/5">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-sm font-medium text-primary mb-1">Current Campaign</p>
                    <h3 className="font-display font-bold text-xl">{history[0]?.settings.niche || 'Fitness'} Strategy</h3>
                    <p className="text-sm text-muted-foreground mt-1">{history[0]?.settings.goal || 'Audience Growth'} Focus</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Activity className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2 font-medium">
                    <span>Campaign Progress</span>
                    <span>60%</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: '60%' }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto w-full pb-20">
      <div className="mb-10">
        <h1 className="text-3xl lg:text-4xl font-display font-bold text-foreground mb-2">Welcome back, Jane 👋</h1>
        <p className="text-muted-foreground text-lg">Let's generate some high-converting content for your clients today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-border/60 shadow-sm h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Strategies This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-32 mt-4 px-2">
                {[2, 4, 1, 3, 5, 2, 4].map((val, i) => {
                  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                      <div className="w-full bg-primary/20 rounded-t-sm hover:bg-primary transition-colors relative" style={{ height: `${(val/5)*100}%` }}>
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-foreground text-background text-xs py-1 px-2 rounded transition-opacity">
                          {val}
                        </div>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">{days[i]}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="border-border/60 shadow-sm h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Content Types Mix</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-5 mt-4">
                {[
                  { label: 'Ideas & Brainstorming', value: 45, color: 'bg-blue-500', text: 'text-blue-500' },
                  { label: 'Hooks & Scripts', value: 30, color: 'bg-purple-500', text: 'text-purple-500' },
                  { label: 'Long-form Captions', value: 25, color: 'bg-green-500', text: 'text-green-500' }
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium text-muted-foreground">{item.label}</span>
                      <span className={`font-bold ${item.text}`}>{item.value}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
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
