import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PurpleCard } from "@/components/dashboard/PurpleCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const profileSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be less than 20 characters"),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(6, "Password must be at least 6 characters"),
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

const ProfileSettings = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [showPasswords, setShowPasswords] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: profile?.username || "",
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const onProfileSubmit = async (data: ProfileForm) => {
    if (!user) return;

    setIsUpdatingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ username: data.username })
        .eq("id", user.id);

      if (error) throw error;

      await refreshProfile();
      toast({ title: "Success", description: "Profile updated successfully" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordForm) => {
    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.newPassword,
      });

      if (error) throw error;

      toast({ title: "Success", description: "Password updated successfully" });
      resetPassword();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 w-full px-2 sm:px-0">
        {/* Welcome Banner */}
        <div className="glass-card rounded-xl p-3 sm:p-4 flex items-center gap-3 border border-cyan-500/20">
          <span className="text-xl sm:text-2xl">👋</span>
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-gray-400 text-sm sm:text-base">Welcome</span>
            <span className="text-white font-bold text-sm sm:text-base">{profile?.username || "User"}</span>
          </div>
        </div>

        {/* Change Password */}
        <PurpleCard title="Change Password" icon="🔐">
          <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="p-3 sm:p-4 space-y-3 sm:space-y-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-gray-400 text-xs sm:text-sm">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showPasswords ? "text" : "password"}
                  placeholder="Enter current password"
                  {...registerPassword("currentPassword")}
                  className="pr-10 h-10 sm:h-12 text-sm sm:text-base bg-[#0f1724] border-white/10 text-white placeholder:text-gray-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPasswords ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {passwordErrors.currentPassword && (
                <p className="text-xs sm:text-sm text-red-400">
                  {passwordErrors.currentPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-gray-400 text-xs sm:text-sm">New Password</Label>
              <Input
                id="newPassword"
                type={showPasswords ? "text" : "password"}
                placeholder="Enter new password"
                {...registerPassword("newPassword")}
                className="h-10 sm:h-12 text-sm sm:text-base bg-[#0f1724] border-white/10 text-white placeholder:text-gray-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-xl"
              />
              {passwordErrors.newPassword && (
                <p className="text-xs sm:text-sm text-red-400">
                  {passwordErrors.newPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-gray-400 text-xs sm:text-sm">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type={showPasswords ? "text" : "password"}
                placeholder="Confirm new password"
                {...registerPassword("confirmPassword")}
                className="h-10 sm:h-12 text-sm sm:text-base bg-[#0f1724] border-white/10 text-white placeholder:text-gray-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-xl"
              />
              {passwordErrors.confirmPassword && (
                <p className="text-xs sm:text-sm text-red-400">
                  {passwordErrors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button 
              type="submit" 
              disabled={isUpdatingPassword}
              className="w-full h-10 sm:h-12 text-sm sm:text-base bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-semibold shadow-lg shadow-cyan-500/25 rounded-xl"
            >
              {isUpdatingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </form>
        </PurpleCard>

        {/* Account Information */}
        <PurpleCard title="Account Information" icon="👤">
          <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="p-3 sm:p-4 space-y-3 sm:space-y-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-gray-400 text-xs sm:text-sm">Username</Label>
              <Input
                id="username"
                placeholder="Enter your name"
                {...registerProfile("username")}
                className="h-10 sm:h-12 text-sm sm:text-base bg-[#0f1724] border-white/10 text-white placeholder:text-gray-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-xl"
              />
              {profileErrors.username && (
                <p className="text-xs sm:text-sm text-red-400">
                  {profileErrors.username.message}
                </p>
              )}
            </div>

            <Button 
              type="submit" 
              disabled={isUpdatingProfile}
              className="w-full h-10 sm:h-12 text-sm sm:text-base bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold shadow-lg shadow-emerald-500/25 rounded-xl"
            >
              {isUpdatingProfile ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Update Account"
              )}
            </Button>
          </form>
        </PurpleCard>

        {/* Footer */}
        <div className="text-center text-gray-500 text-xs sm:text-sm py-4">
          © 2026 - Sarkar PVT Panel
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProfileSettings;