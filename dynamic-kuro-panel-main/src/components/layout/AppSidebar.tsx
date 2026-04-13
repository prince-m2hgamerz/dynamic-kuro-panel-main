import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Key,
  Users,
  Settings,
  FileText,
  Plus,
  DollarSign,
  UserPlus,
  Server,
  Smartphone,
  User,
  Gamepad2,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { NavDotIndicator } from "@/components/ui/nav-dot";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import sarkarLogo from "@/assets/sarkar-logo.jpg";

const mainNavItems = [
  { title: "Dashboard", icon: Home, href: "/dashboard" },
];

const keyNavItems = [
  { title: "All Keys", icon: Key, href: "/keys" },
  { title: "Generate Keys", icon: Plus, href: "/keys/generate" },
  { title: "Games", icon: Gamepad2, href: "/games", roles: ["owner", "co_owner"] },
  { title: "Price Settings", icon: DollarSign, href: "/keys/prices", roles: ["owner", "co_owner"] },
];

const userNavItems = [
  { title: "Users", icon: Users, href: "/users", roles: ["owner", "co_owner"] },
  { title: "Referrals", icon: UserPlus, href: "/referrals" },
];

const settingsNavItems = [
  { title: "Profile", icon: User, href: "/settings/profile" },
  { title: "Telegram 2FA", icon: Smartphone, href: "/settings/telegram", roles: ["owner"] },
  { title: "Server Settings", icon: Server, href: "/settings/server", roles: ["owner", "co_owner"] },
];

const adminNavItems = [
  { title: "Audit Logs", icon: FileText, href: "/logs", roles: ["owner"] },
];

export const AppSidebar = () => {
  const location = useLocation();
  const { role } = useAuth();

  const filterByRole = (items: typeof mainNavItems) =>
    items.filter(
      (item) => !("roles" in item) || (item.roles as string[])?.includes(role || "")
    );

  const isActive = (href: string) => location.pathname === href;

  return (
    <Sidebar className="border-r border-border/30 bg-gradient-to-b from-card to-background sidebar-transition">
      <SidebarHeader className="p-4">
        <Link to="/dashboard" className="flex items-center gap-2">
          <img 
            src={sarkarLogo} 
            alt="Logo" 
            className="h-8 w-8 rounded-lg object-cover border border-primary/30 shadow-lg" 
          />
          <span className="text-xl font-bold gradient-text">Sarkar PVT Panel</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive(item.href)}>
                    <Link 
                      to={item.href}
                      className={cn(
                        "duration-short flex items-center gap-3",
                        isActive(item.href) && "nav-active"
                      )}
                    >
                      <NavDotIndicator active={isActive(item.href)} />
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="bg-border/30" />

        <SidebarGroup>
          <SidebarGroupLabel className="text-primary/70 text-xs uppercase tracking-wider">
            Key Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filterByRole(keyNavItems).map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive(item.href)}>
                    <Link 
                      to={item.href}
                      className={cn(
                        "duration-short flex items-center gap-3",
                        isActive(item.href) && "nav-active"
                      )}
                    >
                      <NavDotIndicator active={isActive(item.href)} />
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="bg-border/30" />

        <SidebarGroup>
          <SidebarGroupLabel className="text-primary/70 text-xs uppercase tracking-wider">
            Users
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filterByRole(userNavItems).map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive(item.href)}>
                    <Link 
                      to={item.href}
                      className={cn(
                        "duration-short flex items-center gap-3",
                        isActive(item.href) && "nav-active"
                      )}
                    >
                      <NavDotIndicator active={isActive(item.href)} />
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="bg-border/30" />

        <SidebarGroup>
          <SidebarGroupLabel className="text-primary/70 text-xs uppercase tracking-wider">
            Settings
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filterByRole(settingsNavItems).map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive(item.href)}>
                    <Link 
                      to={item.href}
                      className={cn(
                        "duration-short flex items-center gap-3",
                        isActive(item.href) && "nav-active"
                      )}
                    >
                      <NavDotIndicator active={isActive(item.href)} />
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {filterByRole(adminNavItems).length > 0 && (
          <>
            <SidebarSeparator className="bg-border/30" />
            <SidebarGroup>
              <SidebarGroupLabel className="text-primary/70 text-xs uppercase tracking-wider">
                Administration
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {filterByRole(adminNavItems).map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive(item.href)}>
                        <Link 
                          to={item.href}
                          className={cn(
                            "duration-short flex items-center gap-3",
                            isActive(item.href) && "nav-active"
                          )}
                        >
                          <NavDotIndicator active={isActive(item.href)} />
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border/30">
        <div className="text-xs text-muted-foreground text-center">
          © 2026 - Sarkar PVT Panel v1.0
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};
