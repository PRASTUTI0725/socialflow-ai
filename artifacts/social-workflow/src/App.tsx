import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WorkflowProvider, useWorkflow } from "./context/workflow-context";
import { ClientProvider } from "./modules/clients/context/client-context";
import { PipelineProvider } from "./modules/pipeline/context/pipeline-context";
import { TaskProvider } from "./modules/tasks/context/task-context";
import { Layout } from "./components/layout";
import { Dashboard } from "./pages/dashboard";
import { CreateStrategy } from "./pages/create-strategy";
import { OutputResults } from "./pages/output-results";
import { ProfileAnalyzer } from "./pages/profile-analyzer";
import { BrandProfilePage } from "./pages/brand-profile";
import { ClientsPage } from "./modules/clients/pages/clients-page";
import { PipelinePage } from "./modules/pipeline/pages/pipeline-page";
import { OnboardingDashboard } from "./pages/onboarding-dashboard";
import { ApprovalWorkflowPage } from "./pages/approval-workflow";
import { ClientPortalPage } from "./pages/client-portal";
import { ClientReportPage } from "./pages/client-report";
import { ThemeProvider } from "./components/theme-provider";
import { ErrorBoundary } from "./components/error-boundary";

const queryClient = new QueryClient();

function MainApp() {
  const { view } = useWorkflow();

  return (
    <Layout>
      {view === 'dashboard' && <Dashboard />}
      {view === 'create' && <CreateStrategy />}
      {view === 'analyzer' && <ProfileAnalyzer />}
      {view === 'brand-profile' && <BrandProfilePage />}
      {view === 'clients' && <ClientsPage />}
      {view === 'pipeline' && <PipelinePage />}
      {view === 'output' && <OutputResults />}
      {view === 'onboarding' && <OnboardingDashboard />}
      {view === 'client-portal' && <ClientPortalPage />}
      {view === 'client-report' && <ClientReportPage />}
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
    <ErrorBoundary>
      <ThemeProvider defaultTheme="system" storageKey="theme">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <ClientProvider>
              <PipelineProvider>
                <TaskProvider>
                  <WorkflowProvider>
                    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                      <Router />
                    </WouterRouter>
                    <Toaster />
                  </WorkflowProvider>
                </TaskProvider>
              </PipelineProvider>
            </ClientProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
