import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/15 text-green-400",
  indexed: "bg-green-500/15 text-green-400",
  confirmed: "bg-green-500/15 text-green-400",
  paid: "bg-green-500/15 text-green-400",
  qualified: "bg-green-500/15 text-green-400",
  pending: "bg-yellow-500/15 text-yellow-400",
  processing: "bg-blue-500/15 text-blue-400",
  contacted: "bg-blue-500/15 text-blue-400",
  new: "bg-brand/15 text-brand",
  failed: "bg-red-500/15 text-red-400",
  cancelled: "bg-red-500/15 text-red-400",
  closed: "bg-surface-2 text-muted",
  handed_off: "bg-orange-500/15 text-orange-400",
};

interface Props {
  status: string;
  label?: string;
}

export function StatusBadge({ status, label }: Props) {
  const color = STATUS_COLORS[status] ?? "bg-surface-2 text-muted";
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium",
        color,
      )}
    >
      {label ?? status}
    </span>
  );
}
