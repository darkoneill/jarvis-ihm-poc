import { motion } from "framer-motion";
import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AnimatedWidgetProps {
  children: ReactNode;
  title?: string;
  icon?: ReactNode;
  className?: string;
  delay?: number;
  enableHover?: boolean;
}

const widgetVariants = {
  initial: { 
    opacity: 0, 
    y: 20,
    scale: 0.95,
  },
  animate: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: {
      duration: 0.2,
    },
  },
};

const hoverVariants = {
  hover: {
    y: -4,
    boxShadow: "0 10px 40px -10px rgba(0, 0, 0, 0.3)",
    transition: {
      duration: 0.2,
      
    },
  },
};

export function AnimatedWidget({
  children,
  title,
  icon,
  className,
  delay = 0,
  enableHover = true,
}: AnimatedWidgetProps) {
  return (
    <motion.div
      variants={widgetVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      whileHover={enableHover ? "hover" : undefined}
      custom={delay}
      transition={{ delay: delay * 0.1 }}
    >
      <motion.div variants={enableHover ? hoverVariants : undefined}>
        <Card className={cn("h-full overflow-hidden", className)}>
          {title && (
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                {icon}
                {title}
              </CardTitle>
            </CardHeader>
          )}
          <CardContent className={!title ? "pt-4" : ""}>
            {children}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

// Animated list component
interface AnimatedListProps {
  children: ReactNode;
  className?: string;
}

const listContainerVariants = {
  initial: {},
  animate: {
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

const listItemVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: 0.3,
      
    },
  },
  exit: { 
    opacity: 0, 
    x: 20,
    transition: {
      duration: 0.2,
    },
  },
};

export function AnimatedList({ children, className }: AnimatedListProps) {
  return (
    <motion.div
      variants={listContainerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedListItem({ children, className }: AnimatedListProps) {
  return (
    <motion.div variants={listItemVariants} className={className}>
      {children}
    </motion.div>
  );
}

// Animated counter for numbers
interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
  suffix?: string;
  prefix?: string;
}

export function AnimatedCounter({
  value,
  duration = 1,
  className,
  suffix = "",
  prefix = "",
}: AnimatedCounterProps) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        key={value}
      >
        {prefix}
        <motion.span
          initial={{ scale: 1.2, color: "var(--primary)" }}
          animate={{ scale: 1, color: "inherit" }}
          transition={{ duration: 0.3 }}
        >
          {value}
        </motion.span>
        {suffix}
      </motion.span>
    </motion.span>
  );
}

// Animated progress bar
interface AnimatedProgressProps {
  value: number;
  max?: number;
  className?: string;
  color?: string;
}

export function AnimatedProgress({
  value,
  max = 100,
  className,
  color = "bg-primary",
}: AnimatedProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn("h-2 bg-muted rounded-full overflow-hidden", className)}>
      <motion.div
        className={cn("h-full rounded-full", color)}
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.5 }}
      />
    </div>
  );
}

// Animated badge/chip
interface AnimatedBadgeProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "success" | "warning" | "error";
}

export function AnimatedBadge({
  children,
  className,
  variant = "default",
}: AnimatedBadgeProps) {
  const variantClasses = {
    default: "bg-primary/10 text-primary",
    success: "bg-green-500/10 text-green-500",
    warning: "bg-yellow-500/10 text-yellow-500",
    error: "bg-red-500/10 text-red-500",
  };

  return (
    <motion.span
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </motion.span>
  );
}

// Animated skeleton loader
interface AnimatedSkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
}

export function AnimatedSkeleton({
  className,
  variant = "rectangular",
}: AnimatedSkeletonProps) {
  const variantClasses = {
    text: "h-4 rounded",
    circular: "rounded-full",
    rectangular: "rounded-lg",
  };

  return (
    <motion.div
      className={cn(
        "bg-muted",
        variantClasses[variant],
        className
      )}
      animate={{
        opacity: [0.5, 1, 0.5],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        
      }}
    />
  );
}

// Animated icon button
interface AnimatedIconButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export function AnimatedIconButton({
  children,
  onClick,
  className,
  disabled,
}: AnimatedIconButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "p-2 rounded-lg transition-colors",
        "hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {children}
    </motion.button>
  );
}
