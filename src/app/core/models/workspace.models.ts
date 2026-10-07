export interface Workspace {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly description: string;
  readonly role: 'Owner' | 'Admin' | 'Contributor' | 'Reader';
  readonly memberCount: number;
  readonly taskCount: number;
  readonly color?: string;
  readonly isDefault?: boolean;
}

export interface WorkspaceResult {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly ownerId: string;
  readonly createdAt: string;
  readonly updatedAt: string | null;
  readonly memberCount?: number;
  readonly membersCount?: number;
  readonly taskCount?: number;
}

export interface WorkspaceMemberResult {
  readonly id: string;
  readonly userId: string;
  readonly createdAt: string;
}

export interface WorkspaceDetailsResult {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly ownerId: string;
  readonly createdAt: string;
  readonly updatedAt: string | null;
  readonly memberIds?: string[];
  readonly members?: WorkspaceMemberResult[];
}

export interface CreateWorkspaceRequest {
  readonly name: string;
  readonly description?: string | null;
}

export interface UpdateWorkspaceRequest {
  readonly name: string;
  readonly description?: string | null;
}

export interface AddWorkspaceMemberRequest {
  readonly userId: string;
}

