"use client";

import React from "react";
import { cn } from "@/lib/utils/utils";

interface BackgroundGradientProps extends React.HTMLAttributes<HTMLDivElement> {
  containerClassName?: string;
}

export const BackgroundGradient: React.FC<BackgroundGradientProps> = ({
  className,
  containerClassName,
  children,
  ...props
}) => {
  return (
    <div className={cn("relative", containerClassName)} {...props}>
      <div
        className={cn(
          "absolute inset-0 rounded-[22px]",
          "bg-gradient-to-br from-transparent via-transparent to-transparent",
          // Glow layers for subtle depth
          "before:content-[''] before:absolute before:-inset-0.5 before:rounded-[24px] before:bg-gradient-to-br before:from-blue-500/20 before:via-purple-500/20 before:to-emerald-500/20 before:blur-2xl before:opacity-60 dark:before:opacity-40",
          "after:content-[''] after:absolute after:-inset-0.5 after:rounded-[24px] after:bg-gradient-to-tr after:from-emerald-500/10 after:via-purple-500/10 after:to-blue-500/10 after:blur-3xl after:opacity-60 dark:after:opacity-40"
        )}
        aria-hidden="true"
      />
      <div
        className={cn(
          "relative rounded-[22px] border",
          "bg-white dark:bg-neutral-900",
          "border-gray-200 dark:border-neutral-800",
          "transition-transform duration-300 ease-out will-change-transform",
          "hover:translate-y-[-2px] hover:shadow-xl hover:shadow-emerald-500/5",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
};


