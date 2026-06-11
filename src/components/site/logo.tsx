import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand-light to-brand-dark font-latin text-sm font-extrabold tracking-tight text-white ring-2 ring-gold/70">
        AI
      </span>
      <span className="font-latin text-xl font-bold tracking-tight text-fg">
        SYNIQ
      </span>
    </span>
  );
}
