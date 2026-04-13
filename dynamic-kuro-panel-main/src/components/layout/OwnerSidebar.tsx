import { useState, useCallback } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  Home,
  Key,
  Activity,
  ChevronDown,
  ChevronUp,
  Users,
  List,
  PlusCircle,
  Clock,
  XCircle,
  DollarSign,
  UserPlus,
  Trash2,
  Settings,
  Bot,
  Shield,
  Gamepad2,
  ScrollText,
  Music,
  Ghost,
  LogOut,
  User,
  AppWindow,
  Package,
} from "lucide-react";
import sarkarLogo from "@/assets/sarkar-logo.jpg";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
// Ghost owner check is now from AuthContext
import { useNavigate } from "react-router-dom";

interface NavSubItem {
  title: string;
  href: string;
  icon: React.ElementType;
}

const keysSubItems: NavSubItem[] = [
  { title: "Keys List", href: "/keys", icon: List },
  { title: "Generate", href: "/keys/generate", icon: PlusCircle },
  { title: "SDK Keys", href: "/keys/sdk", icon: AppWindow },
  { title: "Bot Keys", href: "/keys/bot-keys", icon: Bot },
  { title: "Unused Keys", href: "/keys/unused", icon: Clock },
  { title: "Expired Keys", href: "/keys/expired", icon: XCircle },
  { title: "Price", href: "/keys/prices", icon: DollarSign },
];

const userManagementSubItems: NavSubItem[] = [
  { title: "Manage Users", href: "/users", icon: Users },
  { title: "Add Balance", href: "/users/add-balance", icon: DollarSign },
  { title: "Referrals", href: "/referrals", icon: UserPlus },
  { title: "Clear History", href: "/users/clear-history", icon: Trash2 },
  { title: "Bot Settings", href: "/settings/bots", icon: Bot },
  { title: "Games", href: "/games", icon: Gamepad2 },
  { title: "Songs", href: "/songs", icon: Music },
  { title: "Audit Logs", href: "/audit-logs", icon: ScrollText },
];

const serverSubItems: NavSubItem[] = [
  { title: "Panel Settings", href: "/settings/server", icon: Settings },
  { title: "Packages", href: "/packages", icon: Package },
  { title: "Panel License", href: "/license", icon: Shield },
];

export const OwnerSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut, isGhostOwner } = useAuth();
  const { setOpenMobile } = useSidebar();
  const [keysOpen, setKeysOpen] = useState(true);
  const [usersOpen, setUsersOpen] = useState(false);
  const [serverOpen, setServerOpen] = useState(false);

  const isGhost = isGhostOwner;

  const closeMobileSidebar = useCallback(() => setOpenMobile(false), [setOpenMobile]);

  const isActive = (href: string) => location.pathname === href;
  const isSubActive = (items: NavSubItem[]) =>
    items.some((item) => location.pathname === item.href);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const CollapsibleSection = ({
    title,
    icon: Icon,
    subItems,
    isOpen,
    setIsOpen,
  }: {
    title: string;
    icon: React.ElementType;
    subItems: NavSubItem[];
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
  }) => (
    <div className="space-y-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300",
          "bg-card/60 backdrop-blur-sm border border-border/40 hover:border-primary/40",
          isSubActive(subItems)
            ? "border-primary/50 shadow-[0_0_15px_rgba(var(--primary-rgb),0.15)]"
            : "hover:bg-card/80"
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
            isSubActive(subItems)
              ? "bg-primary/20 text-primary"
              : "bg-muted/50 text-muted-foreground"
          )}>
            <Icon className="h-4 w-4" />
          </div>
          <span className="text-foreground">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      <div
        className={cn(
          "space-y-1 overflow-hidden transition-all duration-300",
          isOpen ? "max-h-[600px] opacity-100 pt-1" : "max-h-0 opacity-0"
        )}
      >
        {subItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            onClick={closeMobileSidebar}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-200 ml-2",
              "bg-card/40 backdrop-blur-sm border border-transparent",
              isActive(item.href)
                ? "border-primary/40 bg-primary/10 text-primary font-medium shadow-[0_0_10px_rgba(var(--primary-rgb),0.1)]"
                : "text-muted-foreground hover:bg-card/60 hover:text-foreground hover:border-border/40"
            )}
          >
            <div className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center",
              isActive(item.href)
                ? "bg-primary/20 text-primary"
                : "bg-muted/30 text-muted-foreground"
            )}>
              <item.icon className="h-3.5 w-3.5" />
            </div>
            <span>{item.title}</span>
          </Link>
        ))}
      </div>
    </div>
  );

  return (
    <Sidebar className="border-r border-border/30 bg-gradient-to-b from-sidebar to-background/95 backdrop-blur-xl">
      {/* Avatar Header */}
      <SidebarHeader className="p-6 border-b border-border/30">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-20 h-20 rounded-full overflow-hidden border-[3px] border-primary/60 shadow-[0_0_25px_rgba(var(--primary-rgb),0.3)] p-0.5">
              <img src={sarkarLogo} alt="Logo" className="w-full h-full object-cover rounded-full" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-background" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-bold gradient-text-sunset tracking-wider">{profile?.panel_name || 'SARKAR'} VIP PANEL</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
              {profile?.username || "Owner"}
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-3 space-y-2 overflow-y-auto">
        {/* Dashboard */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link
                  to="/dashboard"
                  onClick={closeMobileSidebar}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300",
                    "bg-card/60 backdrop-blur-sm border border-border/40",
                    isActive("/dashboard")
                      ? "border-primary/50 bg-primary/10 text-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.15)]"
                      : "text-muted-foreground hover:bg-card/80 hover:text-foreground hover:border-primary/30"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    isActive("/dashboard")
                      ? "bg-primary/20 text-primary"
                      : "bg-muted/50 text-muted-foreground"
                  )}>
                    <Home className="h-4 w-4" />
                  </div>
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Keys */}
        <CollapsibleSection
          title="Keys"
          icon={Key}
          subItems={keysSubItems}
          isOpen={keysOpen}
          setIsOpen={setKeysOpen}
        />

        {/* Users */}
        <CollapsibleSection
          title="Users"
          icon={Users}
          subItems={userManagementSubItems}
          isOpen={usersOpen}
          setIsOpen={setUsersOpen}
        />

        {/* Server */}
        <CollapsibleSection
          title="Server"
          icon={Settings}
          subItems={serverSubItems}
          isOpen={serverOpen}
          setIsOpen={setServerOpen}
        />

        {/* Settings */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link
                  to="/settings/profile"
                  onClick={closeMobileSidebar}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300",
                    "bg-card/60 backdrop-blur-sm border border-border/40",
                    isActive("/settings/profile")
                      ? "border-primary/50 bg-primary/10 text-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.15)]"
                      : "text-muted-foreground hover:bg-card/80 hover:text-foreground hover:border-primary/30"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    isActive("/settings/profile")
                      ? "bg-primary/20 text-primary"
                      : "bg-muted/50 text-muted-foreground"
                  )}>
                    <User className="h-4 w-4" />
                  </div>
                  <span>Profile</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Ghost Panel */}
        {isGhost && (
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    to="/ghost-panel"
                    onClick={closeMobileSidebar}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300",
                      "bg-card/60 backdrop-blur-sm border border-border/40",
                      isActive("/ghost-panel")
                        ? "border-warning/50 bg-warning/10 text-warning shadow-[0_0_15px_rgba(255,200,0,0.15)]"
                        : "text-muted-foreground hover:bg-card/80 hover:text-foreground hover:border-warning/30"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      isActive("/ghost-panel")
                        ? "bg-warning/20 text-warning"
                        : "bg-muted/50 text-muted-foreground"
                    )}>
                      <Ghost className="h-4 w-4" />
                    </div>
                    <span>Ghost Panel</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    to="/request-analyser"
                    onClick={closeMobileSidebar}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300",
                      "bg-card/60 backdrop-blur-sm border border-border/40",
                      isActive("/request-analyser")
                        ? "border-primary/50 bg-primary/10 text-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.15)]"
                        : "text-muted-foreground hover:bg-card/80 hover:text-foreground hover:border-primary/30"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      isActive("/request-analyser")
                        ? "bg-primary/20 text-primary"
                        : "bg-muted/50 text-muted-foreground"
                    )}>
                      <Activity className="h-4 w-4" />
                    </div>
                    <span>Request Analyser</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}

        {/* Logout */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 w-full bg-card/60 backdrop-blur-sm border border-border/40 text-destructive hover:bg-destructive/10 hover:border-destructive/40"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-destructive/10 text-destructive">
                    <LogOut className="h-4 w-4" />
                  </div>
                  <span>Logout</span>
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border/30">
        <div className="text-[10px] text-muted-foreground text-center uppercase tracking-widest">
          © 2026 {profile?.panel_name || 'SARKAR'} PANEL
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};
