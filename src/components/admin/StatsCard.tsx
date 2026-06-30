interface Props {
  label: string;
  value: string | number;
  sub?: string;
}

export function StatsCard({ label, value, sub }: Props) {
  return (
    <div className="bg-surface border border-line rounded-2xl px-5 py-4">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className="text-2xl font-bold text-fg">{value}</p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  );
}
