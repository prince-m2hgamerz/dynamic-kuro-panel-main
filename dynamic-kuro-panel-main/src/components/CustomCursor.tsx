import { useEffect, useState, useRef } from "react";
import { motion, useSpring } from "framer-motion";

export const CustomCursor = () => {
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [visible, setVisible] = useState(false);
  const cursorX = useSpring(0, { stiffness: 500, damping: 28 });
  const cursorY = useSpring(0, { stiffness: 500, damping: 28 });
  const trailX = useSpring(0, { stiffness: 150, damping: 20 });
  const trailY = useSpring(0, { stiffness: 150, damping: 20 });

  useEffect(() => {
    // Disable on touch devices and coarse pointer devices (trackpads/laptops without a mouse)
    if ("ontouchstart" in window) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const handleMouseMove = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
      trailX.set(e.clientX);
      trailY.set(e.clientY);
      if (!visible) setVisible(true);
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);
    const handleMouseLeave = () => setVisible(false);
    const handleMouseEnter = () => setVisible(true);

    const handleHoverStart = () => setIsHovering(true);
    const handleHoverEnd = () => setIsHovering(false);

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);

    // Track hoverable elements
    const addHoverListeners = () => {
      const hoverables = document.querySelectorAll("a, button, [role='button'], input, select, textarea, [data-hover]");
      hoverables.forEach((el) => {
        el.addEventListener("mouseenter", handleHoverStart);
        el.addEventListener("mouseleave", handleHoverEnd);
      });
    };

    addHoverListeners();
    const observer = new MutationObserver(addHoverListeners);
    observer.observe(document.body, { childList: true, subtree: true });

    // Hide default cursor
    document.body.style.cursor = "none";
    const style = document.createElement("style");
    style.id = "custom-cursor-style";
    style.textContent = "a,button,input,select,textarea,[role='button']{cursor:none!important}";
    document.head.appendChild(style);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
      observer.disconnect();
      document.body.style.cursor = "";
      document.getElementById("custom-cursor-style")?.remove();
    };
  }, [visible, cursorX, cursorY, trailX, trailY]);

  // Hide on touch devices
  if (typeof window !== "undefined" && "ontouchstart" in window) return null;

  return (
    <>
      {/* Trail circle */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[10000] rounded-full mix-blend-screen"
        style={{
          x: trailX,
          y: trailY,
          width: isHovering ? 56 : 36,
          height: isHovering ? 56 : 36,
          translateX: isHovering ? -28 : -18,
          translateY: isHovering ? -28 : -18,
          border: `2px solid ${isHovering ? "hsl(var(--primary))" : "hsl(var(--secondary) / 0.5)"}`,
          background: isHovering ? "hsl(var(--primary) / 0.06)" : "transparent",
          opacity: visible ? 1 : 0,
          scale: isClicking ? 0.8 : 1,
          transition: "width 0.3s, height 0.3s, border-color 0.3s, background 0.3s, opacity 0.2s",
        }}
      />
      {/* Dot */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[10001] rounded-full"
        style={{
          x: cursorX,
          y: cursorY,
          width: isHovering ? 0 : 8,
          height: isHovering ? 0 : 8,
          translateX: isHovering ? 0 : -4,
          translateY: isHovering ? 0 : -4,
          background: "hsl(var(--secondary))",
          boxShadow: "0 0 12px hsl(var(--secondary) / 0.8), 0 0 24px hsl(var(--secondary) / 0.4)",
          opacity: visible ? 1 : 0,
          scale: isClicking ? 0.5 : 1,
        }}
      />
    </>
  );
};
