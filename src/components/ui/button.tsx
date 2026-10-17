import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// ==========================================
//  Button — shadcn-style primitive
// ==========================================

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--primary)] text-white hover:opacity-90 shadow-sm hover:shadow",
        secondary:
          "bg-[var(--secondary)] text-[var(--foreground)] hover:bg-[var(--border)]",
        outline:
          "border border-[var(--border)] bg-transparent text-[var(--foreground)] hover:bg-[var(--muted)]",
        ghost:
          "bg-transparent text-[var(--foreground)] hover:bg-[var(--muted)]",
        destructive:
          "bg-[var(--error)] text-[var(--foreground)] hover:opacity-90",
        gold:
          "text-[#1A0A00] font-bold hover:opacity-90 shadow-sm",
        link:
          "bg-transparent text-[#a99ffb] underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-[var(--radius-xs)]",
        default: "h-10 px-5 text-sm rounded-[var(--radius-xs)]",
        lg: "h-11 px-7 text-base rounded-[var(--radius-m)]",
        pill: "h-10 px-6 text-sm rounded-[var(--radius-pill)]",
        icon: "h-9 w-9 rounded-[var(--radius-xs)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
    compoundVariants: [
      {
        variant: "gold",
        class: "bg-[var(--gold)]",
      },
    ],
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild: _asChild, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
