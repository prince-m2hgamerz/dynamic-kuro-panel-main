import { useState, useCallback } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import {
  Home,
  Key,
  ChevronDown,
  ChevronUp,
  List,
  PlusCircle,
  Clock,
  XCircle,
  DollarSign,
  UserPlus,
  User,
  Bot,
  LogOut,
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

interface NavSubItem {
  title: string;
  href: string;
  icon: React.ElementType;
}

const keysSubItems: NavSubItem[] = [
  { title: "Keys List", href: "/keys", icon: List },
  { title: "Generate", href: "/keys/generate", icon: PlusCircle },
  { title: "SDK Keys", href: "/keys/sdk", icon: AppWindow },
  { title: "Packages", href: "/packages", icon: Package },
  { title: "Bot Keys", href: "/keys/bot-keys", icon: Bot },
  { title: "Unused Keys", href: "/keys/unused", icon: Clock },
  { title: "Expired Keys", href: "/keys/expired", icon: XCircle },
  { title: "Price", href: "/keys/prices", icon: DollarSign },
];

export const AdminSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { setOpenMobile } = useSidebar();
  const [keysOpen, setKeysOpen] = useState(true);

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
                ? "border-primary/40 bg-primary/10 text-primary font-medium"
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
              {profile?.username || "Admin"}
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
                    isActive("/dashboard") ? "bg-primary/20 text-primary" : "bg-muted/50 text-muted-foreground"
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

        {/* Referrals */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link
                  to="/referrals"
                  onClick={closeMobileSidebar}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300",
                    "bg-card/60 backdrop-blur-sm border border-border/40",
                    isActive("/referrals")
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-card/80 hover:text-foreground hover:border-primary/30"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    isActive("/referrals") ? "bg-primary/20 text-primary" : "bg-muted/50 text-muted-foreground"
                  )}>
                    <UserPlus className="h-4 w-4" />
                  </div>
                  <span>Referrals</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Profile */}
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
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-card/80 hover:text-foreground hover:border-primary/30"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    isActive("/settings/profile") ? "bg-primary/20 text-primary" : "bg-muted/50 text-muted-foreground"
                  )}>
                    <User className="h-4 w-4" />
                  </div>
                  <span>Profile</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

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
