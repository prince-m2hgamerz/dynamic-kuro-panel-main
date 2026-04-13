import { useCallback } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { AppWindow, Home, Key, Plus, User, LogOut, Package } from "lucide-react";
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

const navItems = [
  { title: "Dashboard", icon: Home, href: "/dashboard" },
  { title: "My Keys", icon: Key, href: "/keys" },
  { title: "Generate Key", icon: Plus, href: "/keys/generate" },
  { title: "SDK Keys", icon: AppWindow, href: "/keys/sdk" },
  { title: "Packages", icon: Package, href: "/packages" },
  { title: "Profile", icon: User, href: "/settings/profile" },
];

export const ResellerSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { setOpenMobile } = useSidebar();

  const closeMobileSidebar = useCallback(() => setOpenMobile(false), [setOpenMobile]);

  const isActive = (href: string) => location.pathname === href;

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

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
              {profile?.username || "Reseller"}
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-3 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <SidebarGroup key={item.href}>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    to={item.href}
                    onClick={closeMobileSidebar}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300",
                      "bg-card/60 backdrop-blur-sm border border-border/40",
                      isActive(item.href)
                        ? "border-primary/50 bg-primary/10 text-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.15)]"
                        : "text-muted-foreground hover:bg-card/80 hover:text-foreground hover:border-primary/30"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      isActive(item.href)
                        ? "bg-primary/20 text-primary"
                        : "bg-muted/50 text-muted-foreground"
                    )}>
                      <item.icon className="h-4 w-4" />
                    </div>
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        ))}

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
