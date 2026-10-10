export interface Workspace {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly description: string;
  readonly role: 'Owner' | 'Admin' | 'Contributor' | 'Reader';
  readonly memberCount: number;
  readonly taskCount: number;
  readonly color: string;
  readonly ownerId?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string | null;
  readonly isDefault?: boolean;
}

/** Item returned by GET /api/v1/workspaces */
export interface WorkspaceResult {
  readonly id: string;
  readonly name: string;
  readonly ownerId: string;
  readonly description: string | null;
  readonly memberCount: number;
  readonly taskCount: number;
  readonly createdAt: string;
  readonly updatedAt: string | null;
}

/** Details returned by GET /api/v1/workspaces/{id} */
export interface WorkspaceDetailsResult {
  readonly id: string;
  readonly name: string;
  readonly ownerId: string;
  readonly description: string | null;
  readonly memberIds: string[];
  readonly createdAt: string;
  readonly updatedAt: string | null;
}

/** Payload for POST /api/v1/workspaces */
export interface CreateWorkspaceRequest {
  readonly name: string;
  readonly description?: string | null;
}

/** Payload for PUT /api/v1/workspaces/{id} */
export interface UpdateWorkspaceRequest {
  readonly name: string;
  readonly description?: string | null;
}

/** Payload for POST /api/v1/workspaces/{id}/members */
export interface AddWorkspaceMemberRequest {
  readonly userId: string;
}

export const WORKSPACE_COLOR_PALETTE = [
  '#0078D4', // Azure Blue
  '#107C10', // Forest Green
  '#5C2D91', // Purple
  '#D83B01', // Orange
  '#008272', // Teal
  '#E3008C', // Magenta
];

export function generateWorkspaceCode(name: string): string {
  return (
    name
      .trim()
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 4)
      .toUpperCase() || 'WS'
  );
}

export function getDeterministicColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash + seed.charCodeAt(i)) % WORKSPACE_COLOR_PALETTE.length;
  }
  return WORKSPACE_COLOR_PALETTE[hash] || WORKSPACE_COLOR_PALETTE[0];
}

export function mapWorkspaceResultToWorkspace(
  res: WorkspaceResult,
  currentUserId?: string | null,
  isAdmin?: boolean,
  isDefault?: boolean,
): Workspace {
  const isOwner = !!currentUserId && res.ownerId.toLowerCase() === currentUserId.toLowerCase();
  const role: 'Owner' | 'Admin' | 'Contributor' | 'Reader' = isOwner
    ? 'Owner'
    : isAdmin
      ? 'Admin'
      : 'Contributor';

  return {
    id: res.id,
    name: res.name,
    code: generateWorkspaceCode(res.name),
    description: res.description ?? '',
    role,
    memberCount: res.memberCount,
    taskCount: res.taskCount,
    ownerId: res.ownerId,
    createdAt: res.createdAt,
    updatedAt: res.updatedAt,
    color: getDeterministicColor(res.id),
    isDefault: !!isDefault,
  };
}
