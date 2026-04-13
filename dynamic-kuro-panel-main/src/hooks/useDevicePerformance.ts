import { useState, useEffect } from "react";

export type PerformanceTier = "high" | "low";

interface DevicePerformance {
  tier: PerformanceTier;
  isMobile: boolean;
  particleMultiplier: number;
  enableBlur: boolean;
  enableMouseTracking: boolean;
  rayCount: number;
  enableEntryAnimations: boolean;
}

const detectMobileDevice = () => {
  if (typeof window === "undefined") return false;

  const widthBased = window.innerWidth < 768;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const noHover = window.matchMedia("(hover: none)").matches;
  const touchCapable = navigator.maxTouchPoints > 0;
  const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobi/i.test(
    navigator.userAgent,
  );
  const ipadDesktopMode = navigator.platform === "MacIntel" && touchCapable;

  return widthBased || coarsePointer || mobileUA || ipadDesktopMode || (touchCapable && noHover);
};

export function useDevicePerformance(): DevicePerformance {
  const [perf, setPerf] = useState<DevicePerformance>(() => getPerformance());

  useEffect(() => {
    const onResize = () => setPerf(getPerformance());
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  return perf;
}

function getPerformance(): DevicePerformance {
  if (typeof window === "undefined") {
    return makeResult("high", false);
  }

  const isMobile = detectMobileDevice();

  if (!isMobile) {
    return makeResult("high", false);
  }

  return makeResult("low", true);
}

function makeResult(tier: PerformanceTier, isMobile: boolean): DevicePerformance {
  const isLow = tier === "low";

  return {
    tier,
    isMobile,
    particleMultiplier: isLow ? 0.3 : 1,
    enableBlur: !isLow,
    enableMouseTracking: !isLow,
    rayCount: isLow ? 4 : 11,
    enableEntryAnimations: !isLow,
  };
}
