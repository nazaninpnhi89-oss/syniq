import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap",
  {
    variants: {
      variant: {
        // دکمه‌ی اصلی برند: پرکننده‌ی آبی با حلقه‌ی ظریف طلایی (اکسنت لوکس)
        primary:
          "bg-gradient-to-b from-brand-light to-brand text-bg font-semibold ring-1 ring-gold/25 hover:from-brand-light hover:to-brand-light shadow-[0_10px_34px_-10px_rgba(61,124,158,0.7)]",
        // اکسنت طلایی — فقط برای موارد خاص و کم‌تکرار
        gold:
          "bg-gold text-bg hover:bg-gold-soft shadow-[0_8px_30px_-8px_rgba(201,178,71,0.45)]",
        outline:
          "border border-line text-fg hover:border-brand-light hover:text-brand-light bg-transparent",
        ghost: "text-fg/80 hover:text-fg hover:bg-surface",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-6 text-sm",
        lg: "h-13 px-8 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({
  className,
  variant,
  size,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
