'use client';
import * as React from 'react';
import type { Role } from '@prisma/client';
import { can, type Permission } from '@/lib/rbac';

export type WorkspaceClientContext = {
  workspaceId: string;
  workspaceName: string;
  isDemo: boolean;
  role: Role;
  userId: string;
  userName: string;
  userEmail: string;
};

const Ctx = React.createContext<WorkspaceClientContext | null>(null);

export function WorkspaceProvider({ value, children }: { value: WorkspaceClientContext; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWorkspace(): WorkspaceClientContext {
  const v = React.useContext(Ctx);
  if (!v) throw new Error('useWorkspace must be used inside WorkspaceProvider');
  return v;
}

/** Client-side convenience only — every server action re-checks permissions. */
export function usePermission(permission: Permission): boolean {
  const { role } = useWorkspace();
  return can(role, permission);
}
