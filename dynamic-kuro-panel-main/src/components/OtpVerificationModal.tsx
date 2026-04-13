import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Loader2, Shield, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const MAX_OTP_ATTEMPTS = 2;

interface OtpVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
  userId: string;
  clientIp?: string;
}

export const OtpVerificationModal = ({
  isOpen,
  onClose,
  onVerified,
  userId,
  clientIp = "",
}: OtpVerificationModalProps) => {
  const [otpCode, setOtpCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [otpSent, setOtpSent] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Use ref to prevent duplicate sends on re-renders
  const hasSentOtpRef = useRef(false);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Send OTP when modal opens - use ref to prevent duplicates
  useEffect(() => {
    if (isOpen && userId && !hasSentOtpRef.current) {
      hasSentOtpRef.current = true;
      sendOtp();
    }
  }, [isOpen, userId]);

  // Reset ref when modal closes
  useEffect(() => {
    if (!isOpen) {
      hasSentOtpRef.current = false;
    }
  }, [isOpen]);

  const sendOtp = async () => {
    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("telegram-otp/send", {
        body: { userId, ipAddress: clientIp },
      });

      if (error) {
        // Handle rate limit error gracefully
        const errorMessage = error.message || "Failed to send OTP";
        
        // Extract wait time from error message if rate limited
        const waitTimeMatch = errorMessage.match(/wait (\d+) seconds/);
        if (waitTimeMatch) {
          const waitTime = parseInt(waitTimeMatch[1], 10);
          setCountdown(waitTime);
          setOtpSent(true); // OTP was already sent previously
          toast({
            title: "OTP Already Sent",
            description: `Check your Telegram. You can resend in ${waitTime}s`,
          });
          return;
        }
        
        toast({
          title: "OTP Send Failed",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      if (!data.success) {
        // Handle rate limit from response body
        const errorMessage = data.error || "Failed to send OTP";
        const waitTimeMatch = errorMessage.match(/wait (\d+) seconds/);
        if (waitTimeMatch) {
          const waitTime = parseInt(waitTimeMatch[1], 10);
          setCountdown(waitTime);
          setOtpSent(true);
          toast({
            title: "OTP Already Sent",
            description: `Check your Telegram. You can resend in ${waitTime}s`,
          });
          return;
        }
        
        toast({
          title: "OTP Send Failed",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      setOtpSent(true);
      setCountdown(60);
      toast({
        title: "OTP Sent",
        description: "Check your Telegram for the verification code",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const verifyOtp = async () => {
    if (otpCode.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter the complete 6-digit code",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("telegram-otp/verify", {
        body: { userId, otpCode },
      });

      if (error) {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        if (newAttempts >= MAX_OTP_ATTEMPTS) {
          toast({
            title: "Too Many Failed Attempts",
            description: "You have been blocked.",
            variant: "destructive",
          });
          // Sign out and redirect to blocked page
          await supabase.auth.signOut();
          onClose();
          navigate("/blocked-message", { replace: true });
          return;
        }
        toast({
          title: "Verification Failed",
          description: `${error.message || "Invalid OTP"}. ${MAX_OTP_ATTEMPTS - newAttempts} attempt(s) remaining.`,
          variant: "destructive",
        });
        return;
      }

      if (!data.success) {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        if (newAttempts >= MAX_OTP_ATTEMPTS) {
          toast({
            title: "Too Many Failed Attempts",
            description: "You have been blocked.",
            variant: "destructive",
          });
          await supabase.auth.signOut();
          onClose();
          navigate("/blocked-message", { replace: true });
          return;
        }
        toast({
          title: "Verification Failed",
          description: `${data.error || "Invalid or expired OTP"}. ${MAX_OTP_ATTEMPTS - newAttempts} attempt(s) remaining.`,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Verified!",
        description: "OTP verified successfully",
      });
      onVerified();
    } catch (error) {
      toast({
        title: "Error",
        description: "Verification failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    setOtpCode("");
    setOtpSent(false);
    // If user cancels OTP without verifying, redirect to blocked page
    onClose();
    supabase.auth.signOut();
    navigate("/blocked-message", { replace: true });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="border-[rgba(0,120,255,0.25)] text-foreground max-w-md" style={{ background: 'linear-gradient(145deg, rgba(2,8,23,0.97) 0%, rgba(5,15,35,0.98) 50%, rgba(2,8,23,0.97) 100%)', boxShadow: '0 0 60px rgba(0,120,255,0.15), 0 0 120px rgba(0,80,200,0.08), inset 0 1px 0 rgba(0,140,255,0.15)' }}>
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,120,255,0.15)', border: '1px solid rgba(0,140,255,0.3)', boxShadow: '0 0 25px rgba(0,120,255,0.25)' }}>
              <Shield className="w-8 h-8" style={{ color: 'rgb(0,140,255)' }} />
            </div>
          </div>
          <DialogTitle className="text-center text-xl text-foreground">Owner Verification</DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Enter the 6-digit OTP sent to your Telegram
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* OTP Input */}
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={otpCode}
              onChange={(value) => setOtpCode(value)}
            >
              <InputOTPGroup>
                {[0,1,2,3,4,5].map((idx) => (
                  <InputOTPSlot key={idx} index={idx} className="text-foreground" style={{ background: 'rgba(0,120,255,0.08)', borderColor: 'rgba(0,140,255,0.25)' }} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          {/* Verify Button */}
          <Button
            onClick={verifyOtp}
            disabled={isVerifying || otpCode.length !== 6}
            className="w-full h-12 text-white font-semibold rounded-xl"
            style={{ background: 'linear-gradient(135deg, rgba(0,120,255,1) 0%, rgba(0,80,200,1) 100%)', boxShadow: '0 4px 20px rgba(0,120,255,0.35)' }}
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Verify OTP
              </>
            )}
          </Button>

          {/* Resend Button */}
          <div className="text-center">
            {countdown > 0 ? (
              <p className="text-muted-foreground text-sm">
                Resend OTP in <span className="font-bold" style={{ color: 'rgb(0,140,255)' }}>{countdown}s</span>
              </p>
            ) : (
              <Button
                variant="ghost"
                onClick={sendOtp}
                disabled={isSending}
                className="hover:bg-transparent/10"
                style={{ color: 'rgb(0,140,255)' }}
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Resend OTP
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Cancel */}
          <Button
            variant="outline"
            onClick={handleClose}
            className="w-full h-12 text-muted-foreground rounded-xl"
            style={{ borderColor: 'rgba(0,120,255,0.2)', background: 'rgba(0,120,255,0.05)' }}
          >
            Cancel Login
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};