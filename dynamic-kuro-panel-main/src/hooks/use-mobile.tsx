import * as React from "react";

const MOBILE_BREAKPOINT = 768;

const detectMobileDevice = () => {
  if (typeof window === "undefined") return false;

  const widthBased = window.innerWidth < MOBILE_BREAKPOINT;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const noHover = window.matchMedia("(hover: none)").matches;
  const touchCapable = navigator.maxTouchPoints > 0;
  const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobi/i.test(
    navigator.userAgent,
  );
  const ipadDesktopMode = navigator.platform === "MacIntel" && touchCapable;

  return widthBased || coarsePointer || mobileUA || ipadDesktopMode || (touchCapable && noHover);
};

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(() => detectMobileDevice());

  React.useEffect(() => {
    const widthQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const coarseQuery = window.matchMedia("(pointer: coarse)");
    const hoverQuery = window.matchMedia("(hover: none)");
    const update = () => setIsMobile(detectMobileDevice());

    update();
    widthQuery.addEventListener("change", update);
    coarseQuery.addEventListener("change", update);
    hoverQuery.addEventListener("change", update);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);

    return () => {
      widthQuery.removeEventListener("change", update);
      coarseQuery.removeEventListener("change", update);
      hoverQuery.removeEventListener("change", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return isMobile;
}
