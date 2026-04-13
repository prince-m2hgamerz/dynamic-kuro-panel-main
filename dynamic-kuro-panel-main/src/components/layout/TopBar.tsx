import { LogOut, User, Key, Plus, ChevronDown, Zap, Sun, Moon } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import sarkarLogo from "@/assets/sarkar-logo.jpg";

interface TopBarProps {
  animationEnabled?: boolean;
  onToggleAnimation?: () => void;
  theme?: "dark" | "light";
  onToggleTheme?: () => void;
}

export const TopBar = ({
  animationEnabled = true,
  onToggleAnimation,
  theme = "dark",
  onToggleTheme,
}: TopBarProps) => {
  const { user, profile, signOut, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const isActive = (path: string) => location.pathname === path;
  const showNavigation = !isMobile && (role === "owner" || role === "admin" || role === "co_owner");

  return (
    <header className="sticky top-0 z-40 flex h-14 min-w-0 items-center gap-1.5 overflow-x-hidden border-b border-border bg-card/95 px-2 backdrop-blur-xl md:h-16 md:gap-3 md:px-4">
      <SidebarTrigger className="-ml-1 shrink-0 text-foreground transition-colors hover:bg-primary/10 hover:text-primary" />

      <div className="mr-1 flex shrink-0 items-center gap-2 md:mr-4 md:gap-3">
        <div className="relative">
          <img
            src={sarkarLogo}
            alt="Logo"
            className="h-8 w-8 rounded-xl border border-primary/40 object-cover shadow-lg shadow-primary/20 md:h-9 md:w-9"
          />
        </div>
        <div className="hidden md:block">
          <span className="text-lg font-display gradient-text-sunset tracking-wider">
            {profile?.panel_name || "SARKAR"}
          </span>
          <p className="-mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">Control Panel</p>
        </div>
      </div>

      {showNavigation && (
        <nav className="hidden items-center gap-1 lg:flex md:gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/keys")}
            className={cn(
              "rounded-xl px-2 text-muted-foreground transition-all duration-200 hover:bg-primary/10 hover:text-primary md:px-3",
              isActive("/keys") && "border border-primary/30 bg-primary/20 text-primary",
            )}
          >
            <Key className="h-4 w-4 lg:mr-2" />
            <span className="hidden uppercase text-xs tracking-wide lg:inline">Keys</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/keys/generate")}
            className={cn(
              "rounded-xl px-2 text-muted-foreground transition-all duration-200 hover:bg-secondary/10 hover:text-secondary md:px-3",
              isActive("/keys/generate") && "border border-secondary/30 bg-secondary/20 text-secondary",
            )}
          >
            <Plus className="h-4 w-4 lg:mr-2" />
            <span className="hidden uppercase text-xs tracking-wide lg:inline">Generate</span>
          </Button>
        </nav>
      )}

      <div className="min-w-0 flex-1" />

      {!isMobile && onToggleTheme && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleTheme}
          className={cn(
            "rounded-xl transition-all duration-200",
            theme === "light"
              ? "bg-warning/10 text-warning shadow-[0_0_15px_rgba(255,200,50,0.3)] hover:bg-warning/20"
              : "bg-secondary/10 text-secondary shadow-[0_0_15px_rgba(0,240,255,0.3)] hover:bg-secondary/20",
          )}
          title={theme === "dark" ? "Switch to day mode" : "Switch to night mode"}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      )}

      {!isMobile && onToggleAnimation && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleAnimation}
          className={cn(
            "rounded-xl transition-all duration-200",
            animationEnabled
              ? "bg-accent/10 text-accent shadow-[0_0_15px_rgba(255,107,43,0.3)] hover:bg-accent/20"
              : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
          )}
          title={animationEnabled ? "Disable effects" : "Enable effects"}
        >
          <Zap className="h-4 w-4" />
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex shrink-0 items-center gap-2 rounded-xl border border-transparent px-2 text-foreground transition-all duration-200 hover:border-primary/30 hover:bg-primary/10 md:gap-3 md:px-3"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-primary/40 bg-gradient-to-br from-primary/30 to-accent/30 shadow-lg shadow-primary/20 md:h-9 md:w-9">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="hidden text-left md:block">
              <span className="block text-sm font-semibold">{profile?.username || "User"}</span>
              <span className="block text-[10px] uppercase tracking-wider text-primary">{role || "Member"}</span>
            </div>
            <ChevronDown className="hidden h-4 w-4 text-muted-foreground md:block" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="glass-card-glow w-56 rounded-xl border-primary/30">
          <DropdownMenuLabel className="text-muted-foreground">
            <div className="flex flex-col">
              <span className="font-semibold text-foreground">{profile?.username}</span>
              <span className="text-xs text-muted-foreground">{user?.email}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-primary/20" />
          <DropdownMenuItem
            onClick={() => navigate("/settings/profile")}
            className="cursor-pointer rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
          >
            <User className="mr-2 h-4 w-4" />
            Profile Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-primary/20" />
          <DropdownMenuItem
            onClick={handleSignOut}
            className="cursor-pointer rounded-lg text-destructive transition-colors hover:bg-destructive/20 hover:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};
