import { ReactNode, useState } from "react";
import { OwnerSidebar } from "./OwnerSidebar";
import { ResellerSidebar } from "./ResellerSidebar";
import { AdminSidebar } from "./AdminSidebar";
import { TopBar } from "./TopBar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import PerspectiveRays from "@/components/PerspectiveRays";
import IgniteBackground from "@/components/IgniteBackground";
import TechMarquee from "@/components/TechMarquee";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePanelTheme } from "@/hooks/usePanelTheme";

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { role } = useAuth();
  const isMobile = useIsMobile();

  const [animationEnabled, setAnimationEnabled] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("animation-enabled");
      return stored !== "false";
    }
    return true;
  });

  const { theme, toggleTheme } = usePanelTheme();

  const toggleAnimation = () => {
    setAnimationEnabled((prev) => {
      const newValue = !prev;
      localStorage.setItem("animation-enabled", String(newValue));
      return newValue;
    });
  };

  const getSidebar = () => {
    if (role === "owner" || role === "co_owner") {
      return <OwnerSidebar />;
    }
    if (role === "admin") {
      return <AdminSidebar />;
    }
    if (role === "reseller") {
      return <ResellerSidebar />;
    }
    return <ResellerSidebar />;
  };

  return (
    <SidebarProvider>
      <div className="relative flex h-svh min-h-svh max-h-svh w-full overflow-hidden">
        <div
          className="fixed inset-0"
          style={{
            zIndex: 0,
            background:
              theme === "dark"
                ? `radial-gradient(ellipse at 20% 10%, rgba(0,111,255,0.12) 0%, transparent 50%),
                   radial-gradient(ellipse at 80% 90%, rgba(0,62,161,0.08) 0%, transparent 50%),
                   radial-gradient(ellipse at 50% 50%, rgba(0,80,200,0.04) 0%, transparent 60%),
                   linear-gradient(180deg, rgb(0,12,36) 0%, rgb(0,0,0) 100%)`
                : "#000",
          }}
        >
          {!isMobile && theme === "dark" && <PerspectiveRays subtle />}
          {!isMobile && theme === "light" && <IgniteBackground />}
        </div>

        <div className="relative z-[1]">{getSidebar()}</div>
        <SidebarInset className="relative z-[1] flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-transparent">
          <TopBar
            animationEnabled={animationEnabled}
            onToggleAnimation={toggleAnimation}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
          <main className="flex-1 min-h-0 min-w-0 overflow-x-hidden overflow-y-auto overscroll-y-contain touch-pan-y [webkit-overflow-scrolling:touch] p-3 pb-24 md:p-6 md:pb-6">
            {theme === "light" && !isMobile && (
              <div className="mb-6">
                <TechMarquee theme={theme} />
              </div>
            )}
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};
