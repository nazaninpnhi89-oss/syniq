export const ROLE_RANK = {
  viewer: 1,
  operator: 2,
  editor: 3,
  admin: 4,
  owner: 5,
} as const;

export type AdminRole = keyof typeof ROLE_RANK;

export function isAdminRole(role: string | null | undefined): role is AdminRole {
  return !!role && role in ROLE_RANK;
}

export function roleAtLeast(role: string | null | undefined, min: AdminRole): boolean {
  const rank = isAdminRole(role) ? ROLE_RANK[role] : 0;
  return rank >= ROLE_RANK[min];
}

export function isWriteAllowed(role: string | null | undefined): boolean {
  return roleAtLeast(role, "operator");
}
