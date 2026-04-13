import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "owner" | "admin" | "user" | "co_owner" | "reseller";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  profile: Profile | null;
  isGhostOwner: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; data: any }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

interface Profile {
  id: string;
  username: string;
  balance: number;
  telegram_chat_id: string | null;
  two_factor_enabled: boolean;
  status: string;
  last_login: string | null;
  account_expires_at: string | null;
  panel_name: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_LOADING_TIMEOUT = 8000; // 8s max loading

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isGhostOwner, setIsGhostOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles_safe")
        .select("id, username, balance, telegram_chat_id, two_factor_enabled, status, last_login, account_expires_at, panel_name")
        .eq("id", userId)
        .maybeSingle();

      // If profile is missing, ask backend to auto-create it
      if (!profileData) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const accessToken = sessionData.session?.access_token;
          if (accessToken) {
            await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ensure-profile`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({}),
            });
          }
        } catch {
          // swallow
        }

        const { data: profileDataAfter } = await supabase
          .from("profiles_safe")
          .select("id, username, balance, telegram_chat_id, two_factor_enabled, status, last_login, account_expires_at, panel_name")
          .eq("id", userId)
          .maybeSingle();

        if (profileDataAfter) {
          setProfile(profileDataAfter as Profile);
        }
      } else {
        setProfile(profileData as Profile);
      }

      // Fetch role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (roleData) {
        setRole(roleData.role as AppRole);
      }

      // Check ghost owner status server-side
      const { data: ghostData } = await supabase.rpc("is_ghost_owner", { _user_id: userId });
      setIsGhostOwner(!!ghostData);
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  }, []);

  const refreshProfile = async () => {
    if (user) {
      await fetchUserData(user.id);
    }
  };

  useEffect(() => {
    // Safety timeout to prevent infinite loading
    const loadingTimer = setTimeout(() => {
      setLoading(false);
    }, AUTH_LOADING_TIMEOUT);

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => fetchUserData(session.user.id), 0);
        } else {
          setProfile(null);
          setRole(null);
          setIsGhostOwner(false);
        }
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    return () => {
      clearTimeout(loadingTimer);
      subscription.unsubscribe();
    };
  }, [fetchUserData]);

  const signIn = async (email: string, password: string) => {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Login timed out. Please check your connection and try again.")), 15000)
    );
    const loginPromise = supabase.auth.signInWithPassword({ email, password });
    const { data, error } = await Promise.race([loginPromise, timeoutPromise]);
    return { error, data };
  };

  const signUp = async (email: string, password: string, username: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { username },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setRole(null);
    setIsGhostOwner(false);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        role,
        profile,
        isGhostOwner,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
