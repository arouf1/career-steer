"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { BorderBeam } from "@/components/ui/border-beam";

export interface SwitchOption<T extends string = string> {
  key: T;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

interface AnimatedSwitchProps<T extends string = string> {
  options: SwitchOption<T>[];
  activeOption: T;
  onOptionChange: (option: T) => void;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "compact";
  layoutId?: string;
  mobileIconsOnly?: boolean;
  mobileIconsThreshold?: number;
  animationDelay?: number;
  loading?: boolean;
}

const sizeConfig = {
  sm: {
    container: "p-1",
    button: "px-4 py-2 text-sm gap-2",
    icon: "h-4 w-4",
  },
  md: {
    container: "p-1.5",
    button: "px-5 py-2.5 text-sm gap-2",
    icon: "h-[18px] w-[18px]",
  },
  lg: {
    container: "p-2",
    button: "px-6 py-3 text-base gap-2.5",
    icon: "h-5 w-5",
  },
};

export function AnimatedSwitch<T extends string = string>({
  options,
  activeOption,
  onOptionChange,
  className,
  size = "md",
  variant = "default",
  layoutId = "animated-switch",
  mobileIconsOnly = true,
  mobileIconsThreshold = 2,
  animationDelay = 0,
  loading = false,
}: AnimatedSwitchProps<T>) {
  const config = sizeConfig[size];
  const shouldShowIconsOnlyOnMobile =
    mobileIconsOnly && options.length >= mobileIconsThreshold;

  return (
    <motion.div
      className={cn(
        "flex flex-col items-center justify-center w-full",
        variant === "compact" ? "mb-4" : "mb-6 md:mb-8",
      )}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        ease: "easeOut",
        delay: animationDelay,
      }}
    >
      <div
        className={cn(
          "relative inline-flex rounded-full bg-muted/60 shadow-[inset_0_1px_3px_0_rgba(0,0,0,0.06)]",
          options.length <= 2
            ? "max-w-md"
            : options.length <= 4
              ? "max-w-2xl"
              : "max-w-4xl",
          "w-full",
          config.container,
          className,
        )}
      >
        {loading && (
          <BorderBeam
            size={60}
            duration={3}
            delay={0}
            colorFrom="#3b82f6"
            colorTo="#8b5cf6"
            borderWidth={2}
          />
        )}

        <div className="flex w-full">
          {options.map((option, idx) => {
            const IconComponent = option.icon;
            const isActive = activeOption === option.key;

            return (
              <button
                key={option.key}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOptionChange(option.key);
                }}
                onMouseDown={(e) => e.preventDefault()}
                className={cn(
                  "relative flex-1 flex items-center justify-center rounded-full font-medium whitespace-nowrap transition-colors duration-200 select-none",
                  config.button,
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground/80",
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId={layoutId}
                    className="absolute inset-0 rounded-full bg-background shadow-sm ring-1 ring-border/50"
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 35,
                      mass: 0.8,
                    }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  {IconComponent && (
                    <IconComponent className={cn(config.icon, "shrink-0")} />
                  )}
                  <span className={cn(shouldShowIconsOnlyOnMobile && "hidden md:inline")}>
                    {option.label}
                  </span>
                  {option.count !== undefined && (
                    <span className="hidden md:inline-flex ml-1 bg-muted-foreground/15 text-muted-foreground text-xs px-1.5 py-0.5 rounded-full tabular-nums">
                      {option.count}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {shouldShowIconsOnlyOnMobile && (
        <div
          className={cn(
            "flex justify-between w-full mt-2 md:hidden",
            options.length <= 2
              ? "max-w-md"
              : options.length <= 4
                ? "max-w-2xl"
                : "max-w-4xl",
          )}
        >
          {options.map((option, index) => {
            const isActive = activeOption === option.key;
            return (
              <motion.div
                key={`label-${option.key}`}
                className={cn(
                  "text-center flex-1 text-xs px-1",
                  isActive
                    ? "text-foreground font-medium"
                    : "text-muted-foreground",
                )}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  ease: "easeOut",
                  delay: animationDelay + 0.2 + index * 0.05,
                }}
              >
                {option.label}
                {option.count !== undefined && (
                  <span className="ml-1 bg-muted-foreground/15 text-muted-foreground text-xs px-1.5 py-0.5 rounded-full">
                    {option.count}
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
