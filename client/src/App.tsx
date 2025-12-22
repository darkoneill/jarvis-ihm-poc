import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import LoginPage from "@/pages/LoginPage";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { KeyboardShortcutsProvider } from "./contexts/KeyboardShortcutsContext";
import { Loader2 } from "lucide-react";
import { PageTransition } from "./components/PageTransition";
import { useLocation } from "wouter";

// Import components
import { ChatInterface } from "./components/ChatInterface";
import { LogViewer } from "./components/LogViewer";
import { TaskBoard } from "./components/TaskBoard";
import { HardwareDashboard } from "./components/HardwareDashboard";
import { CalendarView } from "./components/CalendarView";
import { KnowledgeBase } from "./components/KnowledgeBase";
import { DashboardLayout } from "./components/DashboardLayout";
import SettingsPage from "./pages/SettingsPage";
import DashboardPage from "./pages/DashboardPage";
import LLMSettingsPage from "./pages/LLMSettingsPage";
import LocalLoginPage from "./pages/LocalLoginPage";
import ConversationStatsPage from "./pages/ConversationStatsPage";

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Chargement...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}

function Router() {
  const [location] = useLocation();
  
  return (
    <PageTransition pageKey={location}>
    <Switch>
      <Route path="/login">
        <LoginPage />
      </Route>
      <Route path="/login/local">
        <LocalLoginPage />
      </Route>
      <Route path="/">
        <ProtectedRoute>
          <DashboardLayout>
            <ChatInterface />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/logs">
        <ProtectedRoute>
          <DashboardLayout>
            <LogViewer />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/tasks">
        <ProtectedRoute>
          <DashboardLayout>
            <TaskBoard />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/hardware">
        <ProtectedRoute>
          <DashboardLayout>
            <HardwareDashboard />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/calendar">
        <ProtectedRoute>
          <DashboardLayout>
            <CalendarView />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/knowledge">
        <ProtectedRoute>
          <DashboardLayout>
            <KnowledgeBase />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute>
          <DashboardLayout>
            <SettingsPage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/settings/llm">
        <ProtectedRoute>
          <DashboardLayout>
            <LLMSettingsPage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute>
          <DashboardLayout>
            <DashboardPage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/stats">
        <ProtectedRoute>
          <DashboardLayout>
            <ConversationStatsPage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
    </PageTransition>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" storageKey="jarvis-theme">
        <AuthProvider>
          <KeyboardShortcutsProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </KeyboardShortcutsProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
