import { ChatInterface } from "@/components/ChatInterface";
import { DashboardLayout } from "@/components/DashboardLayout";
import { LogViewer } from "@/components/LogViewer";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";

// Placeholder components for other routes
const TasksPlaceholder = () => <div className="p-4 border border-dashed border-border rounded-lg h-full flex items-center justify-center text-muted-foreground">Module Tâches (En développement)</div>;
const CalendarPlaceholder = () => <div className="p-4 border border-dashed border-border rounded-lg h-full flex items-center justify-center text-muted-foreground">Module Calendrier (En développement)</div>;
const KnowledgePlaceholder = () => <div className="p-4 border border-dashed border-border rounded-lg h-full flex items-center justify-center text-muted-foreground">Module Connaissances (En développement)</div>;
const WorkflowsPlaceholder = () => <div className="p-4 border border-dashed border-border rounded-lg h-full flex items-center justify-center text-muted-foreground">Module Workflows (En développement)</div>;
const NotFound = () => <div className="p-4 text-center text-muted-foreground">404 - Page non trouvée</div>;

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={ChatInterface} />
        <Route path="/logs" component={LogViewer} />
        <Route path="/tasks" component={TasksPlaceholder} />
        <Route path="/calendar" component={CalendarPlaceholder} />
        <Route path="/knowledge" component={KnowledgePlaceholder} />
        <Route path="/workflows" component={WorkflowsPlaceholder} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
