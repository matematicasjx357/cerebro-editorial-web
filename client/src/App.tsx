import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import Dashboard from "@/pages/Dashboard";
import Projects from "@/pages/Projects";
import ProjectDetail from "@/pages/ProjectDetail";
import Campaigns from "@/pages/Campaigns";
import CampaignDetail from "@/pages/CampaignDetail";
import AutomationPanel from "@/pages/AutomationPanel";
import MasterPrompts from "@/pages/MasterPrompts";
import KnowledgeBase from "@/pages/KnowledgeBase";
import Keywords from "@/pages/Keywords";
import EditorialMemory from "@/pages/EditorialMemory";
import JobsQueue from "@/pages/JobsQueue";
import { Loader2 } from "lucide-react";

// Protected route wrapper
function ProtectedRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <NotFound />;
  }

  return <Component />;
}

function Router() {
  const { isAuthenticated } = useAuth();

  return (
    <Switch>
      {/* Public routes */}
      <Route path={"/"} component={Home} />

      {/* Protected dashboard routes */}
      {isAuthenticated && (
        <>
          <Route path={"/dashboard"} component={() => <ProtectedRoute component={Dashboard} />} />
          <Route path={"/projects"} component={() => <ProtectedRoute component={Projects} />} />
          <Route path={"/projects/:id"} component={() => <ProtectedRoute component={ProjectDetail} />} />
          <Route path={"/campaigns"} component={() => <ProtectedRoute component={Campaigns} />} />
          <Route path={"/campaigns/:id"} component={() => <ProtectedRoute component={CampaignDetail} />} />
          <Route path={"/automation"} component={() => <ProtectedRoute component={AutomationPanel} />} />
          <Route path={"/prompts"} component={() => <ProtectedRoute component={MasterPrompts} />} />
          <Route path={"/knowledge-base"} component={() => <ProtectedRoute component={KnowledgeBase} />} />
          <Route path={"/keywords"} component={() => <ProtectedRoute component={Keywords} />} />
          <Route path={"/editorial-memory"} component={() => <ProtectedRoute component={EditorialMemory} />} />
          <Route path={"/jobs"} component={() => <ProtectedRoute component={JobsQueue} />} />
        </>
      )}

      {/* 404 fallback */}
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          {isAuthenticated ? (
            <DashboardLayout>
              <Router />
            </DashboardLayout>
          ) : (
            <Router />
          )}
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
