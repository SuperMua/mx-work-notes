import type { WorkspaceRole } from '@shared';

export interface RequestUser {
  userId: string
  email: string
  workspaceId: string
  role: WorkspaceRole
}
