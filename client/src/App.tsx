import { ChatInterface } from "@/components/ChatInterface";
import { DashboardLayout } from "@/components/DashboardLayout";
import { LogViewer } from "@/components/LogViewer";
import { TaskBoard } from "@/components/TaskBoard";
import { HardwareDashboard } from "@/components/HardwareDashboard";
import { CalendarView } from "@/components/CalendarView";
import { KnowledgeBase } from "@/components/KnowledgeBase";
import { WorkflowEditor } from "@/components/WorkflowEditor";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import { AuthProvider } from "@/contexts/AuthContext";
import LoginPage from "@/pages/LoginPage";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Placeholder components for other routes
// const TasksPlaceholder = () => <div className="p-4 border border-dashed border-border rounded-lg h-full flex items-center justify-center text-muted-foreground">Module Tâches (En développement)</div>;
// const CalendarPlaceholder = () => <div className="p-4 border border-dashed border-border rounded-lg h-full flex items-center justify-center text-muted-foreground">Module Calendrier (En développement)</div>;
// const KnowledgePlaceholder = () => <div className="p-4 border border-dashed border-border rounded-lg h-full flex items-center justify-center text-muted-foreground">Module Connaissances (En développement)</div>;
// const WorkflowsPlaceholder = () => <div className="p-4 border border-dashed border-border rounded-lg h-full flex items-center justify-center text-muted-foreground">Module Workflows (En développement)</div>;
const NotFound = () => <div className="p-4 text-center text-muted-foreground">404 - Page non trouvée</div>;

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/:rest*">
        <ProtectedRoute>
          <DashboardLayout>
            <Switch>
              <Route path="/" component={ChatInterface} />
              <Route path="/logs" component={LogViewer} />
              <Route path="/tasks" component={TaskBoard} />
              <Route path="/hardware" component={HardwareDashboard} />
              <Route path="/calendar" component={CalendarView} />
              <Route path="/knowledge" component={KnowledgeBase} />
              <Route path="/workflows" component={WorkflowEditor} />
              <Route component={NotFound} />
            </Switch>
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider
          defaultTheme="dark"
          // storageKey="jarvis-theme"
        >
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
export default App;
