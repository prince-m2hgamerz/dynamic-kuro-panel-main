import { useState, useEffect, useCallback } from "react";
import { Key, UserPlus, LogIn, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface ActivityItem {
  id: string;
  type: "key_generated" | "user_registered" | "user_login";
  description: string;
  timestamp: string;
  isNew?: boolean;
}

export const RecentActivity = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivity = useCallback(async () => {
    try {
      // Fetch recent keys
      const { data: keysData } = await supabase
        .from("license_keys_safe")
        .select("id, key_code, created_at")
        .order("created_at", { ascending: false })
        .limit(3);

      // Fetch recent user registrations
      const { data: usersData } = await supabase
        .from("profiles_safe")
        .select("id, username, created_at")
        .order("created_at", { ascending: false })
        .limit(3);

      const keyActivities: ActivityItem[] = (keysData || []).map((key) => ({
        id: `key-${key.id}`,
        type: "key_generated",
        description: `Key generated: ${key.key_code.substring(0, 8)}...`,
        timestamp: key.created_at,
      }));

      const userActivities: ActivityItem[] = (usersData || []).map((user) => ({
        id: `user-${user.id}`,
        type: "user_registered",
        description: `User registered: ${user.username}`,
        timestamp: user.created_at,
      }));

      // Combine and sort by timestamp
      const allActivities = [...keyActivities, ...userActivities]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5);

      setActivities(allActivities);
    } catch (error) {
      console.error("Error fetching activity:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivity();

    // Subscribe to license_keys changes for realtime updates
    const keysChannel = supabase
      .channel('activity_keys_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'license_keys' },
        (payload) => {
          const newKey = payload.new as { id: string; key_code: string; created_at: string };
          setActivities(prev => [{
            id: `key-${newKey.id}`,
            type: 'key_generated' as const,
            description: `Key generated: ${newKey.key_code.substring(0, 8)}...`,
            timestamp: newKey.created_at,
            isNew: true
          }, ...prev.map(a => ({ ...a, isNew: false }))].slice(0, 5));
          
          // Remove "new" flag after animation
          setTimeout(() => {
            setActivities(prev => prev.map(a => ({ ...a, isNew: false })));
          }, 3000);
        }
      )
      .subscribe();

    // Subscribe to profiles changes (new users)
    const usersChannel = supabase
      .channel('activity_profiles_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'profiles' },
        (payload) => {
          const newUser = payload.new as { id: string; username: string; created_at: string };
          setActivities(prev => [{
            id: `user-${newUser.id}`,
            type: 'user_registered' as const,
            description: `User registered: ${newUser.username}`,
            timestamp: newUser.created_at,
            isNew: true
          }, ...prev.map(a => ({ ...a, isNew: false }))].slice(0, 5));
          
          // Remove "new" flag after animation
          setTimeout(() => {
            setActivities(prev => prev.map(a => ({ ...a, isNew: false })));
          }, 3000);
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(keysChannel);
      supabase.removeChannel(usersChannel);
    };
  }, [fetchActivity]);

  const getIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "key_generated":
        return <Key className="h-4 w-4 text-primary" />;
      case "user_registered":
        return <UserPlus className="h-4 w-4 text-success" />;
      case "user_login":
        return <LogIn className="h-4 w-4 text-accent" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse flex items-center gap-3 py-2">
            <div className="h-8 w-8 bg-secondary/50 rounded-full" />
            <div className="flex-1 h-4 bg-secondary/50 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className={cn(
            "flex items-center gap-3 py-2 border-b border-border/30 last:border-0 duration-short",
            activity.isNew && "bg-primary/20 rounded-lg px-2 animate-pulse"
          )}
        >
          <div className="h-8 w-8 rounded-full bg-secondary/50 flex items-center justify-center">
            {getIcon(activity.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm text-foreground truncate">{activity.description}</p>
              {activity.isNew && (
                <span className="text-xs bg-success text-white px-1.5 py-0.5 rounded-full font-medium shrink-0">
                  NEW
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
