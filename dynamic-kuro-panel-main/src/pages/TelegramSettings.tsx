import { useState } from "react";
import { Smartphone, Link, Unlink, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const TelegramSettings = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [chatId, setChatId] = useState(profile?.telegram_chat_id || "");
  const [isLinking, setIsLinking] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const linkTelegram = async () => {
    if (!user || !chatId.trim()) return;

    setIsLinking(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ telegram_chat_id: chatId.trim() })
        .eq("id", user.id);

      if (error) throw error;

      await refreshProfile();
      toast({
        title: "Success",
        description: "Telegram account linked successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to link Telegram",
        variant: "destructive",
      });
    } finally {
      setIsLinking(false);
    }
  };

  const unlinkTelegram = async () => {
    if (!user) return;

    setIsLinking(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ telegram_chat_id: null, two_factor_enabled: false })
        .eq("id", user.id);

      if (error) throw error;

      setChatId("");
      await refreshProfile();
      toast({
        title: "Success",
        description: "Telegram account unlinked",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to unlink Telegram",
        variant: "destructive",
      });
    } finally {
      setIsLinking(false);
    }
  };

  const toggle2FA = async (enabled: boolean) => {
    if (!user) return;

    if (enabled && !profile?.telegram_chat_id) {
      toast({
        title: "Error",
        description: "Please link your Telegram account first",
        variant: "destructive",
      });
      return;
    }

    setIsToggling(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ two_factor_enabled: enabled })
        .eq("id", user.id);

      if (error) throw error;

      await refreshProfile();
      toast({
        title: "Success",
        description: `Two-factor authentication ${enabled ? "enabled" : "disabled"}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update 2FA settings",
        variant: "destructive",
      });
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Telegram 2FA</h1>
          <p className="text-muted-foreground">
            Secure your account with Telegram two-factor authentication
          </p>
        </div>

        {/* Link Telegram */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-info/10 rounded-lg">
              <Smartphone className="h-5 w-5 text-info" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Telegram Account</h2>
              <p className="text-sm text-muted-foreground">
                Link your Telegram to receive verification codes
              </p>
            </div>
          </div>

          {profile?.telegram_chat_id ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-success/10 border border-success/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Link className="h-5 w-5 text-success" />
                  <div>
                    <p className="font-medium text-success">Telegram Linked</p>
                    <p className="text-sm text-muted-foreground">
                      Chat ID: {profile.telegram_chat_id}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={unlinkTelegram}
                  disabled={isLinking}
                >
                  {isLinking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Unlink className="mr-2 h-4 w-4" />
                      Unlink
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Telegram Chat ID</Label>
                <Input
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                  placeholder="Enter your Telegram chat ID"
                  className="bg-secondary/50"
                />
                <p className="text-xs text-muted-foreground">
                  Start a chat with our bot and send /start to get your Chat ID
                </p>
              </div>

              <Button onClick={linkTelegram} disabled={isLinking || !chatId.trim()}>
                {isLinking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Linking...
                  </>
                ) : (
                  <>
                    <Link className="mr-2 h-4 w-4" />
                    Link Telegram
                  </>
                )}
              </Button>
            </div>
          )}
        </GlassCard>

        {/* 2FA Toggle */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Two-Factor Authentication</h2>
              <p className="text-sm text-muted-foreground">
                Require a verification code from Telegram when logging in
              </p>
            </div>
            <Switch
              checked={profile?.two_factor_enabled || false}
              onCheckedChange={toggle2FA}
              disabled={isToggling || !profile?.telegram_chat_id}
            />
          </div>

          {!profile?.telegram_chat_id && (
            <p className="text-sm text-warning mt-4">
              ⚠️ Link your Telegram account first to enable 2FA
            </p>
          )}
        </GlassCard>
      </div>
    </DashboardLayout>
  );
};

export default TelegramSettings;
