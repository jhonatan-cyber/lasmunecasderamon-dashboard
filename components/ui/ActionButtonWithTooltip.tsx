import React from "react";
import { Tooltip, TooltipTrigger, TooltipContent } from "./tooltip";

interface ActionButtonWithTooltipProps {
  onClick: () => void;
  children: React.ReactNode;
  tooltip: string;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}

export function ActionButtonWithTooltip({
  onClick,
  children,
  tooltip,
  className,
  type = "button",
  disabled,
}: ActionButtonWithTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type={type}
          className={className}
          onClick={onClick}
          disabled={disabled}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
} 