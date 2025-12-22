import { motion, AnimatePresence, Variants } from "framer-motion";
import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  pageKey: string;
}

const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98,
  },
  enter: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.3,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.98,
    transition: {
      duration: 0.2,
    },
  },
};

export function PageTransition({ children, pageKey }: PageTransitionProps) {
  return (
    <motion.div
      key={pageKey}
      initial="initial"
      animate="enter"
      exit="exit"
      variants={pageVariants}
      className="h-full"
    >
      {children}
    </motion.div>
  );
}

// Fade transition variant
export const fadeVariants: Variants = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

// Slide from right variant
export const slideRightVariants: Variants = {
  initial: { opacity: 0, x: 50 },
  enter: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: -50, transition: { duration: 0.2 } },
};

// Slide from left variant
export const slideLeftVariants: Variants = {
  initial: { opacity: 0, x: -50 },
  enter: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: 50, transition: { duration: 0.2 } },
};

// Scale up variant
export const scaleVariants: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  enter: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } },
};

// Stagger children animation
export const staggerContainerVariants: Variants = {
  initial: {},
  enter: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
};

export const staggerItemVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

// Widget animation variants
export const widgetVariants: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 10 },
  enter: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { 
      duration: 0.4,
    } 
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    y: -10,
    transition: { 
      duration: 0.2 
    } 
  },
  hover: {
    scale: 1.02,
    transition: { duration: 0.2 },
  },
};

// Modal/Dialog animation variants
export const modalVariants: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 20 },
  enter: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { 
      duration: 0.25,
    } 
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    y: 10,
    transition: { 
      duration: 0.15 
    } 
  },
};

// Backdrop animation
export const backdropVariants: Variants = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

// Notification toast animation
export const toastVariants: Variants = {
  initial: { opacity: 0, x: 100, scale: 0.9 },
  enter: { 
    opacity: 1, 
    x: 0, 
    scale: 1,
    transition: { 
      type: "spring", 
      stiffness: 400, 
      damping: 25 
    } 
  },
  exit: { 
    opacity: 0, 
    x: 100, 
    scale: 0.9,
    transition: { 
      duration: 0.2 
    } 
  },
};

// Sidebar animation
export const sidebarVariants: Variants = {
  expanded: { 
    width: 240,
    transition: { 
      duration: 0.3,
    } 
  },
  collapsed: { 
    width: 72,
    transition: { 
      duration: 0.3,
    } 
  },
};

// List item animation
export const listItemVariants: Variants = {
  initial: { opacity: 0, x: -20 },
  enter: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

// Pulse animation for status indicators
export const pulseVariants: Variants = {
  pulse: {
    scale: [1, 1.1, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
    },
  },
};

// Glow animation for highlights
export const glowVariants: Variants = {
  glow: {
    boxShadow: [
      "0 0 0 0 rgba(59, 130, 246, 0)",
      "0 0 20px 5px rgba(59, 130, 246, 0.3)",
      "0 0 0 0 rgba(59, 130, 246, 0)",
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
    },
  },
};
