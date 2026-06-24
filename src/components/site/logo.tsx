import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full">
        <Image
          src="/logo-icon.jpg"
          alt="SYNIQ logo"
          fill
          sizes="36px"
          className="object-cover"
          priority
        />
      </span>
      <span className="font-latin text-xl font-bold tracking-tight text-fg">
        SYNIQ
      </span>
    </span>
  );
}
