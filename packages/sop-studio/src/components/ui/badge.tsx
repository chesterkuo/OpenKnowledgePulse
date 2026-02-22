import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-kp-teal focus:ring-offset-2 focus:ring-offset-kp-dark",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-kp-teal text-kp-heading hover:bg-kp-teal/80",
        secondary:
          "border-transparent bg-kp-panel text-kp-text hover:bg-kp-navy",
        destructive:
          "border-transparent bg-kp-error text-white hover:bg-kp-error/80",
        outline: "border-kp-border text-kp-text",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
