import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WorkflowProvider, useWorkflow } from "./context/workflow-context";
import { Layout } from "./components/layout";
import { Dashboard } from "./pages/dashboard";
import { CreateStrategy } from "./pages/create-strategy";
import { OutputResults } from "./pages/output-results";
import { ProfileAnalyzer } from "./pages/profile-analyzer";
import { BrandProfilePage } from "./pages/brand-profile";
import { ThemeProvider } from "./components/theme-provider";

const queryClient = new QueryClient();

function MainApp() {
  const { view } = useWorkflow();

  return (
    <Layout>
      {view === 'dashboard' && <Dashboard />}
      {view === 'create' && <CreateStrategy />}
      {view === 'analyzer' && <ProfileAnalyzer />}
      {view === 'brand-profile' && <BrandProfilePage />}
      {view === 'output' && <OutputResults />}
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/">
        <MainApp />
      </Route>
      <Route>
        <MainApp />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WorkflowProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </WorkflowProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
