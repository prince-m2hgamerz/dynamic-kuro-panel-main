import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface ServerLockoutResponse {
  locked: boolean;
  remainingSeconds?: number;
  lockoutMinutes?: number;
  attemptsLeft: number;
  totalFails?: number;
  error?: string;
}

async function callLockoutApi(action: string, authToken?: string): Promise<ServerLockoutResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/login-lockout?action=${action}`,
    { method: 'POST', headers }
  );
  return res.json();
}

export const useLoginLockout = () => {
  const [isLocked, setIsLocked] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const [lockoutCount, setLockoutCount] = useState(0);
  const [checked, setChecked] = useState(false);

  // Check server-side lockout status on mount
  useEffect(() => {
    callLockoutApi('check')
      .then((data) => {
        if (data.locked) {
          setIsLocked(true);
          setRemainingSeconds(data.remainingSeconds || 0);
          setAttemptsLeft(0);
          setLockoutCount(Math.ceil((data.totalFails || 5) / 5));
        } else {
          setIsLocked(false);
          setAttemptsLeft(data.attemptsLeft ?? 5);
        }
        setChecked(true);
      })
      .catch(() => {
        // If server check fails, allow login (fail open for UX, server still enforces)
        setChecked(true);
      });
  }, []);

  // Countdown timer for locked state
  useEffect(() => {
    if (!isLocked || remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          setIsLocked(false);
          setAttemptsLeft(5);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isLocked, remainingSeconds]);

  // Record a failed attempt — server-side
  const recordFailedAttempt = useCallback(async () => {
    try {
      const data = await callLockoutApi('record-fail');
      if (data.locked) {
        setIsLocked(true);
        setRemainingSeconds(data.remainingSeconds || 0);
        setAttemptsLeft(0);
        setLockoutCount((prev) => prev + 1);
      } else {
        setAttemptsLeft(data.attemptsLeft ?? 0);
      }
    } catch {
      // Fail open for UX
    }
  }, []);

  // Reset on successful login — server-side
  const resetLockout = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      await callLockoutApi('reset', token || undefined);
    } catch {
      // best effort
    }
    setIsLocked(false);
    setRemainingSeconds(0);
    setAttemptsLeft(5);
  }, []);

  return {
    isLocked,
    remainingSeconds,
    lockoutMinutes: Math.ceil(remainingSeconds / 60),
    attemptsLeft,
    lockoutCount,
    recordFailedAttempt,
    resetLockout,
    checked, // so Login page can wait for server check before rendering
  };
};
