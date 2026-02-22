import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-kp-border bg-kp-navy px-3 py-2 text-sm text-kp-text ring-offset-kp-dark file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-kp-text placeholder:text-kp-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kp-teal focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
