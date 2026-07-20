"use client";

import { createContext, useContext } from "react";
import { type AdminRole, isWriteAllowed, roleAtLeast } from "@/lib/admin/roles";

const AdminRoleContext = createContext<AdminRole>("viewer");

export function AdminRoleProvider({
  role,
  children,
}: {
  role: AdminRole;
  children: React.ReactNode;
}) {
  return (
    <AdminRoleContext.Provider value={role}>{children}</AdminRoleContext.Provider>
  );
}

export function useAdminRole(): AdminRole {
  return useContext(AdminRoleContext);
}

export function useCanWrite(): boolean {
  return isWriteAllowed(useContext(AdminRoleContext));
}

export function useRoleAtLeast(min: AdminRole): boolean {
  return roleAtLeast(useContext(AdminRoleContext), min);
}
