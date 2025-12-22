import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

interface User {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  role: "admin" | "user";
  loginMethod: string | null;
  createdAt: Date;
  lastSignedIn: Date;
}

interface UserPreferences {
  theme: "light" | "dark" | "system";
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  language: string;
}

interface AuthContextType {
  user: User | null;
  preferences: UserPreferences;
  login: () => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
}

const defaultPreferences: UserPreferences = {
  theme: "dark",
  notificationsEnabled: true,
  soundEnabled: false,
  language: "fr",
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Get OAuth login URL
function getLoginUrl(): string {
  const appId = import.meta.env.VITE_APP_ID || "";
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL || "https://manus.im/oauth";
  const callbackUrl = `${window.location.origin}/api/oauth/callback`;
  
  // Generate a random state for CSRF protection
  const state = Math.random().toString(36).substring(2, 15);
  sessionStorage.setItem("oauth_state", state);
  
  return `${oauthPortalUrl}?app_id=${appId}&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${state}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  // tRPC query for current user
  const { data: userData, isLoading: isUserLoading, refetch } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  // tRPC mutation for logout
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      setUser(null);
      localStorage.removeItem("jarvis_preferences");
      setLocation("/login");
    },
  });

  // Load preferences from localStorage
  useEffect(() => {
    const storedPrefs = localStorage.getItem("jarvis_preferences");
    if (storedPrefs) {
      try {
        const parsed = JSON.parse(storedPrefs);
        setPreferences({ ...defaultPreferences, ...parsed });
      } catch (e) {
        console.error("Failed to parse stored preferences", e);
      }
    }
  }, []);

  // Update user when data changes
  useEffect(() => {
    if (userData) {
      setUser({
        id: userData.id,
        openId: userData.openId,
        name: userData.name,
        email: userData.email,
        role: userData.role as "admin" | "user",
        loginMethod: userData.loginMethod,
        createdAt: new Date(userData.createdAt),
        lastSignedIn: new Date(userData.lastSignedIn),
      });
    } else {
      setUser(null);
    }
    setIsLoading(isUserLoading);
  }, [userData, isUserLoading]);

  const login = useCallback(() => {
    // Redirect to OAuth login
    window.location.href = getLoginUrl();
  }, []);

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync();
  }, [logoutMutation]);

  const updatePreferences = useCallback((prefs: Partial<UserPreferences>) => {
    setPreferences(prev => {
      const updated = { ...prev, ...prefs };
      localStorage.setItem("jarvis_preferences", JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        preferences,
        login, 
        logout, 
        isAuthenticated: !!user, 
        isLoading,
        updatePreferences,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
