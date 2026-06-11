import { cn } from "@/lib/utils";

export function Container({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-5 sm:px-8", className)}>
      {children}
    </div>
  );
}

export function SectionHeading({
  kicker,
  title,
  className,
}: {
  kicker?: string;
  title: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", className)}>
      {kicker ? (
        <div className="mb-4 flex items-center gap-3">
          <span className="brand-rule" />
          <span className="font-latin text-sm font-medium uppercase tracking-[0.2em] text-gold">
            {kicker}
          </span>
        </div>
      ) : null}
      <h2 className="text-balance text-3xl font-bold leading-tight text-fg sm:text-4xl">
        {title}
      </h2>
    </div>
  );
}
