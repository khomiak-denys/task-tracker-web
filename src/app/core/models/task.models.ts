export type TaskStatus = 'Todo' | 'InProgress' | 'InReview' | 'Done' | 'Cancelled';

export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';

export type MyTasksFilterType = 'all' | 'created' | 'assigned';

export interface TaskFilterParams {
  readonly workspaceId?: string | null;
  readonly type?: string | null;
  readonly search?: string | null;
  readonly status?: string | null;
  readonly priority?: string | null;
  readonly assigneeId?: string | null;
  readonly createdById?: string | null;
  readonly tag?: string | null;
  readonly page?: number;
  readonly pageSize?: number;
}

export interface UserResult {
  readonly id: string;
  readonly email: string;
  readonly userName: string;
  readonly fullName: string | null;
}

export interface TaskResult {
  readonly id: string;
  readonly workspaceId?: string;
  readonly title: string;
  readonly description: string | null;
  readonly status: TaskStatus;
  readonly priority: Priority;
  readonly deadline: string | null;
  readonly assigneeId?: string | null;
  readonly tags: string[];
}

export interface TimeLogResult {
  readonly id: string;
  readonly userId: string;
  readonly minutesSpent: number;
  readonly description: string | null;
  readonly loggedDate: string;
  readonly createdAt: string;
}

export interface TaskComment {
  readonly id: string;
  readonly taskId?: string;
  readonly author: UserResult;
  readonly content: string;
  readonly createdAt: string;
}

export interface TaskDetailsResult extends TaskResult {
  readonly createdAt: string;
  readonly updatedAt: string | null;
  readonly assignee: UserResult | null;
  readonly createdBy: UserResult;
  readonly timeLogs: TimeLogResult[];
  readonly comments?: TaskComment[];
  readonly createdById?: string;
  readonly assignedUser?: UserResult | null;
  readonly createdByUser?: UserResult;
}

export interface PaginationResult<T> {
  readonly items: T[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalCount: number;
}

export interface CreateTaskRequest {
  readonly workspaceId?: string | null;
  readonly title: string;
  readonly description?: string | null;
  readonly priority: Priority;
  readonly deadline?: string | null;
  readonly assigneeId?: string | null;
  readonly tags?: string[];
}

export interface UpdateTaskRequest {
  readonly title: string;
  readonly description?: string | null;
  readonly priority: Priority;
  readonly deadline?: string | null;
  readonly tags?: string[];
}

export interface ChangeStatusRequest {
  readonly status: TaskStatus;
}

export interface LogTimeRequest {
  readonly minutesSpent: number;
  readonly description?: string | null;
  readonly loggedDate: string; // YYYY-MM-DD
}
