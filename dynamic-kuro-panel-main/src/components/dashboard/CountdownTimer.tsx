import { useEffect, useState } from "react";

interface CountdownTimerProps {
  expiresAt: Date | null;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export const CountdownTimer = ({ expiresAt }: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!expiresAt) return;

    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = expiresAt.getTime() - now.getTime();

      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / (1000 * 60)) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  const formatNumber = (num: number) => num.toString();

  if (!expiresAt) {
    return (
      <div className="text-center py-6">
        <p className="text-2xl font-bold text-gray-400">No Expiration Set</p>
      </div>
    );
  }

  return (
    <div className="text-center py-6">
      <p className="text-3xl md:text-4xl font-bold text-white tracking-wider">
        <span className="text-orange-400">{formatNumber(timeLeft.days)}</span>
        <span className="text-gray-400">D</span>
        <span className="mx-2 text-gray-500">:</span>
        <span className="text-orange-400">{formatNumber(timeLeft.hours)}</span>
        <span className="text-gray-400">H</span>
        <span className="mx-2 text-gray-500">:</span>
        <span className="text-orange-400">{formatNumber(timeLeft.minutes)}</span>
        <span className="text-gray-400">M</span>
        <span className="mx-2 text-gray-500">:</span>
        <span className="text-orange-400">{formatNumber(timeLeft.seconds)}</span>
        <span className="text-gray-400">S</span>
      </p>
    </div>
  );
};
