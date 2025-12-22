import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

// Import components
import { ChatInterface } from "./components/ChatInterface";
import { LogViewer } from "./components/LogViewer";
import { TaskBoard } from "./components/TaskBoard";
import { HardwareDashboard } from "./components/HardwareDashboard";
import { CalendarView } from "./components/CalendarView";
import { KnowledgeBase } from "./components/KnowledgeBase";
import { WorkflowEditor } from "./components/WorkflowEditor";
import { DashboardLayout } from "./components/DashboardLayout";

function Router() {
  return (
    <Switch>
      <Route path="/">
        <DashboardLayout>
          <ChatInterface />
        </DashboardLayout>
      </Route>
      <Route path="/logs">
        <DashboardLayout>
          <LogViewer />
        </DashboardLayout>
      </Route>
      <Route path="/tasks">
        <DashboardLayout>
          <TaskBoard />
        </DashboardLayout>
      </Route>
      <Route path="/hardware">
        <DashboardLayout>
          <HardwareDashboard />
        </DashboardLayout>
      </Route>
      <Route path="/calendar">
        <DashboardLayout>
          <CalendarView />
        </DashboardLayout>
      </Route>
      <Route path="/knowledge">
        <DashboardLayout>
          <KnowledgeBase />
        </DashboardLayout>
      </Route>
      <Route path="/workflows">
        <DashboardLayout>
          <WorkflowEditor />
        </DashboardLayout>
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" storageKey="jarvis-theme">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
