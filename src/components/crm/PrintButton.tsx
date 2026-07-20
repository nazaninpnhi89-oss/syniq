"use client";

export function PrintButton({ label }: { label: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="text-xs font-medium bg-brand text-white px-3 py-1.5 rounded-lg hover:bg-brand-dark transition-colors"
    >
      {label}
    </button>
  );
}
