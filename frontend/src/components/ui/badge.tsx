import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        case: "border-transparent bg-violet-500/20 text-violet-200 border-violet-500/40 font-bold",
        fact: "border-transparent bg-amber-500/20 text-amber-200 border-amber-500/40 font-bold",
        person: "border-transparent bg-sky-500/20 text-sky-200 border-sky-500/40 font-bold",
        bank: "border-transparent bg-emerald-500/20 text-emerald-200 border-emerald-500/40 font-bold",
        phone: "border-transparent bg-orange-500/20 text-orange-200 border-orange-500/40 font-bold",
        risk: "border-transparent bg-red-500/20 text-red-200 border-red-500/40 font-bold",
        bridge: "border-transparent bg-amber-500/20 text-amber-200 border-amber-500/40 font-bold",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
