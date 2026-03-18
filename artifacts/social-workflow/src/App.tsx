import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WorkflowProvider, useWorkflow } from "./context/workflow-context";
import { Layout } from "./components/layout";
import { Dashboard } from "./pages/dashboard";
import { CreateStrategy } from "./pages/create-strategy";
import { OutputResults } from "./pages/output-results";

const queryClient = new QueryClient();

// View orchestrator since we use view state instead of full routing for the internal tool
function MainApp() {
  const { view } = useWorkflow();

  return (
    <Layout>
      {view === 'dashboard' && <Dashboard />}
      {view === 'create' && <CreateStrategy />}
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
        {/* Fallback for 404 just renders the app shell with dashboard */}
        <MainApp />
      </Route>
    </Switch>
  );
}

function App() {
  return (
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
  );
}

export default App;
