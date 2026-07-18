import * as React from "react"

import { cn } from "@/lib/utils/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <>
        <style>{`
          input[type="password"]::-webkit-credentials-auto-fill-button,
          input[type="password"]::-webkit-password-manager-save-button,
          input[type="password"]::-webkit-password-manager-save-button-icon,
          input[type="password"]::-webkit-password-manager-save-button-label {
            display: none !important;
            visibility: hidden !important;
            pointer-events: none !important;
            width: 0 !important;
            height: 0 !important;
          }
          input[type="password"] {
            font-variant-numeric: tabular-nums;
          }
          input[type="password"]::-ms-reveal {
            display: none !important;
          }
          input[type="password"]::-moz-reveal {
            display: none !important;
          }
        `}</style>
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-full border border-input bg-background bg-gray-100 px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            className
          )}
          ref={ref}
          {...props}
        />
      </>
    )
  }
)
Input.displayName = "Input"

export { Input }
