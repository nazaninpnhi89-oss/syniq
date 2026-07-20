"use client";

import { useState, useTransition } from "react";
import { updateUserRole, toggleUserActive } from "@/lib/admin/user-actions";
import { ROLE_RANK, type AdminRole } from "@/lib/admin/roles";

const ADMIN_ROLES = Object.keys(ROLE_RANK) as AdminRole[];

interface Props {
  locale: string;
  userId: string;
  role: string;
  isActive: boolean;
  canEdit: boolean;
  canGrantAdmin: boolean;
  roleLabels: Record<string, string>;
  activateLabel: string;
  deactivateLabel: string;
}

export function UserManageControls({
  locale,
  userId,
  role,
  isActive,
  canEdit,
  canGrantAdmin,
  roleLabels,
  activateLabel,
  deactivateLabel,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRoleChange(newRole: AdminRole) {
    setError(null);
    startTransition(async () => {
      const res = await updateUserRole({ locale, targetId: userId, newRole });
      if (res?.error) setError(res.error);
    });
  }

  function handleToggleActive() {
    setError(null);
    startTransition(async () => {
      const res = await toggleUserActive({ locale, targetId: userId, isActive: !isActive });
      if (res?.error) setError(res.error);
    });
  }

  if (!canEdit) return null;

  return (
    <div className="flex items-center gap-2">
      <select
        defaultValue={role}
        disabled={pending}
        onChange={(e) => handleRoleChange(e.target.value as AdminRole)}
        className="text-xs bg-surface-2 border border-line rounded-lg px-2 py-1 text-fg disabled:opacity-50"
      >
        {ADMIN_ROLES.filter((r) => canGrantAdmin || (r !== "owner" && r !== "admin")).map((r) => (
          <option key={r} value={r}>
            {roleLabels[r] ?? r}
          </option>
        ))}
      </select>
      <button
        onClick={handleToggleActive}
        disabled={pending}
        className="text-xs text-muted hover:text-fg transition-colors px-2 py-1 rounded-lg hover:bg-surface-2 disabled:opacity-50"
      >
        {isActive ? deactivateLabel : activateLabel}
      </button>
      {error && <span className="text-[11px] text-red-400">{error}</span>}
    </div>
  );
}
