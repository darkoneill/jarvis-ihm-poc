import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  Activity,
  Bot,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutDashboard,
  Library,
  LogOut,
  Settings,
  User,
  Workflow,
  Wifi,
  WifiOff
} from "lucide-react";
import { NotificationCenter } from "./NotificationCenter";
import { ExportButton } from "./ExportButton";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { Link, useLocation } from "wouter";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [location] = useLocation();
  const { isConnected } = useWebSocket("/ws", { showToasts: false });
  const { user, logout } = useAuth();

  const navItems = [
    { icon: Bot, label: "Dialogue", href: "/" },
    { icon: FileText, label: "Logs", href: "/logs" },
    { icon: LayoutDashboard, label: "Tâches", href: "/tasks" },
    { icon: Activity, label: "Hardware", href: "/hardware" },
    { icon: Calendar, label: "Calendrier", href: "/calendar" },
    { icon: Library, label: "Connaissances", href: "/knowledge" },
    { icon: Workflow, label: "Workflows", href: "/workflows" },
  ];

  // Get user initials for avatar
  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans">
      {/* Sidebar */}
      <aside
        className={cn(
          "relative flex flex-col border-r border-border bg-sidebar transition-all duration-300 ease-in-out",
          isCollapsed ? "w-[60px]" : "w-[240px]"
        )}
      >
        {/* Logo Area */}
        <div className="flex h-[60px] items-center justify-center border-b border-border">
          <div className="flex items-center gap-2 font-bold text-xl text-primary">
            <div className="h-8 w-8 rounded bg-primary/20 flex items-center justify-center text-primary border border-primary/50">
              J
            </div>
            {!isCollapsed && <span className="tracking-widest">JARVIS</span>}
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="grid gap-1 px-2 group-[[data-collapsed=true]]:justify-center group-[[data-collapsed=true]]:px-2">
            {navItems.map((item, index) => {
              const isActive = location === item.href;
              return (
                <Tooltip key={index} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Link href={item.href}>
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-start gap-3 mb-1",
                          isCollapsed ? "justify-center px-2" : "px-4",
                          isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium border-l-2 border-primary rounded-l-none"
                        )}
                      >
                        <item.icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
                        {!isCollapsed && <span>{item.label}</span>}
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  {isCollapsed && (
                    <TooltipContent side="right" className="flex items-center gap-4">
                      {item.label}
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </nav>
        </ScrollArea>

        {/* User Profile / Settings */}
        <div className="p-2 border-t border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3",
                  isCollapsed ? "justify-center px-2" : "px-4"
                )}
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs bg-primary/20 text-primary">
                    {getInitials(user?.name || null)}
                  </AvatarFallback>
                </Avatar>
                {!isCollapsed && (
                  <div className="flex flex-col items-start text-left">
                    <span className="text-sm font-medium truncate max-w-[140px]">
                      {user?.name || "Utilisateur"}
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                      {user?.email || ""}
                    </span>
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{user?.name || "Utilisateur"}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {user?.email || ""}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="h-4 w-4 mr-2" />
                Profil
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                Paramètres
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={() => logout()}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Collapse Toggle */}
        <div className="absolute -right-3 top-1/2 transform -translate-y-1/2 z-20">
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6 rounded-full border bg-background shadow-md hover:bg-accent"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronLeft className="h-3 w-3" />
            )}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background/50 backdrop-blur-sm">
        {/* Header */}
        <header className="h-[60px] border-b border-border flex items-center px-6 justify-between bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
           <div className="flex items-center gap-2 text-sm text-muted-foreground">
             <span className="font-mono text-xs uppercase tracking-wider text-primary/70">System Status:</span>
             <span className="flex items-center gap-1.5 text-xs font-medium text-green-500">
               <span className="relative flex h-2 w-2">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
               </span>
               ONLINE
             </span>
           </div>
           <div className="flex items-center gap-3">
             <ExportButton size="sm" />
             <NotificationCenter />
             <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
               {isConnected ? (
                 <Wifi className="h-3.5 w-3.5 text-green-500" />
               ) : (
                 <WifiOff className="h-3.5 w-3.5 text-red-500" />
               )}
             </div>
             <div className="font-mono text-xs text-muted-foreground opacity-50">
               v5.9.0
             </div>
           </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
