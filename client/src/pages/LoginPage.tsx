import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Bot, Lock, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      setLocation("/");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  const handleLogin = () => {
    login();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-sm relative z-10">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
              <Bot className="h-10 w-10" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-primary">JARVIS</CardTitle>
          <CardDescription className="text-base">
            Système d'Intelligence Artificielle v5.9
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>Connectez-vous avec votre compte Manus pour accéder au système Jarvis.</p>
          </div>

          <div className="space-y-3">
            <Button 
              className="w-full gap-2 h-12 text-base" 
              onClick={handleLogin}
            >
              <Lock className="h-5 w-5" />
              Se connecter avec Manus
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Accès sécurisé</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4 w-full text-center text-xs text-muted-foreground">
            <div className="flex flex-col items-center gap-1">
              <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                <span className="text-green-500 text-lg">✓</span>
              </div>
              <span>OAuth 2.0</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                <span className="text-blue-500 text-lg">🔒</span>
              </div>
              <span>Chiffré</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                <span className="text-purple-500 text-lg">⚡</span>
              </div>
              <span>Session</span>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
