import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import IPLockdownGuard from "@/components/IPLockdownGuard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BackgroundMusicPlayer } from "@/components/BackgroundMusicPlayer";
import { ScrollProgress } from "@/components/ScrollProgress";
import { useForceRefresh } from "@/hooks/useForceRefresh";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// Eager-load lightweight pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import BlockedMessage from "./pages/BlockedMessage";
import NotFound from "./pages/NotFound";

// Lazy-load heavy dashboard pages for faster initial load
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Keys = lazy(() => import("./pages/Keys"));
const GenerateKeys = lazy(() => import("./pages/GenerateKeys"));
const SdkKeys = lazy(() => import("./pages/SdkKeys"));
const PriceSettings = lazy(() => import("./pages/PriceSettings"));
const GamesManagement = lazy(() => import("./pages/GamesManagement"));
const Users = lazy(() => import("./pages/Users"));
const ApprovedPackages = lazy(() => import("./pages/ApprovedPackages"));
const Referrals = lazy(() => import("./pages/Referrals"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const ProfileSettings = lazy(() => import("./pages/ProfileSettings"));
const TelegramSettings = lazy(() => import("./pages/TelegramSettings"));
const ServerSettings = lazy(() => import("./pages/ServerSettings"));
const UnusedKeys = lazy(() => import("./pages/UnusedKeys"));
const ExpiredKeys = lazy(() => import("./pages/ExpiredKeys"));
const AddBalance = lazy(() => import("./pages/AddBalance"));
const ClearHistory = lazy(() => import("./pages/ClearHistory"));
const BotSettings = lazy(() => import("./pages/BotSettings"));
const BotKeys = lazy(() => import("./pages/BotKeys"));
const License = lazy(() => import("./pages/License"));
const Songs = lazy(() => import("./pages/Songs"));
const GhostPanel = lazy(() => import("./pages/GhostPanel"));
const RequestAnalyser = lazy(() => import("./pages/RequestAnalyser"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="flex-1 flex items-center justify-center">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
  </div>
);

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes location={location}>
        {/* Public routes */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/blocked-message" element={<BlockedMessage />} />

        {/* Protected routes - All authenticated users */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/keys" element={<Keys />} />
          <Route path="/keys/generate" element={<GenerateKeys />} />
          <Route path="/keys/sdk" element={<SdkKeys />} />
          <Route path="/settings/profile" element={<ProfileSettings />} />
          <Route path="/settings/telegram" element={<TelegramSettings />} />
        </Route>

        {/* Admin and above */}
        <Route element={<ProtectedRoute allowedRoles={["owner", "co_owner", "admin"]} />}>
          <Route path="/referrals" element={<Referrals />} />
          <Route path="/keys/unused" element={<UnusedKeys />} />
          <Route path="/keys/expired" element={<ExpiredKeys />} />
          <Route path="/keys/bot-keys" element={<BotKeys />} />
          <Route path="/keys/prices" element={<PriceSettings />} />
        </Route>

        {/* Owner and Co-Owner only */}
        <Route element={<ProtectedRoute allowedRoles={["owner", "co_owner"]} />}>
          <Route path="/settings/server" element={<ServerSettings />} />
          <Route path="/settings/bots" element={<BotSettings />} />
          <Route path="/users/add-balance" element={<AddBalance />} />
          <Route path="/users/clear-history" element={<ClearHistory />} />
          <Route path="/games" element={<GamesManagement />} />
          <Route path="/users" element={<Users />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
          <Route path="/license" element={<License />} />
          <Route path="/songs" element={<Songs />} />
        </Route>

        {/* Owner only */}
        <Route element={<ProtectedRoute allowedRoles={["owner"]} />}>
          <Route path="/ghost-panel" element={<GhostPanel />} />
          <Route path="/request-analyser" element={<RequestAnalyser />} />
        </Route>

        {/* Packages - all authenticated users */}
        <Route element={<ProtectedRoute />}>
          <Route path="/packages" element={<ApprovedPackages />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

const AppInner = () => {
  useForceRefresh();
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ErrorBoundary>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollProgress />
            <BackgroundMusicPlayer />
            <AppInner />
            <IPLockdownGuard>
              <AnimatedRoutes />
            </IPLockdownGuard>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ErrorBoundary>
  </QueryClientProvider>
);

export default App;
