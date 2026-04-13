import React from 'react';
import { motion } from 'framer-motion';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

interface PageTransitionProps {
  children: React.ReactNode;
}

const contentVariants = {
  hidden: { 
    opacity: 0.001, 
    y: 48,
    scale: 0.98,
    filter: "blur(6px)",
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      type: "spring",
      stiffness: 40,
      damping: 30,
      mass: 1,
      staggerChildren: 0.06,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.99,
    filter: "blur(3px)",
    transition: {
      duration: 0.3,
      ease: [0.55, 0.06, 0.68, 0.19],
    },
  },
};

export const itemVariant = {
  hidden: { opacity: 0, y: 24, filter: "blur(4px)" },
  visible: { 
    opacity: 1, 
    y: 0, 
    filter: "blur(0px)",
    transition: { 
      type: "spring",
      stiffness: 40,
      damping: 30,
      mass: 1,
    },
  },
};

const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const perf = useDevicePerformance();

  if (!perf.enableEntryAnimations) {
    return <div className="w-full">{children}</div>;
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={contentVariants}
      className="w-full"
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
