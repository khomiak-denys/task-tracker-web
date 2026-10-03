import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import {
  TaskComment,
  TaskDetailsResult,
  TaskStatus,
  UserResult,
} from '../../../core/models/task.models';

@Component({
  selector: 'app-task-details',
  standalone: true,
  imports: [CommonModule, DatePipe, DecimalPipe],
  templateUrl: './task-details.component.html',
  styleUrl: './task-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskDetailsComponent {
  private readonly cdr = inject(ChangeDetectorRef);

  @Input()
  set task(value: TaskDetailsResult | null) {
    this._task = value;
    this.loadCommentsForTask(value);
    this.cdr.markForCheck();
  }
  get task(): TaskDetailsResult | null {
    return this._task;
  }
  private _task: TaskDetailsResult | null = null;

  @Input() isOpen = false;

  @Output() readonly closeBlade = new EventEmitter<void>();
  @Output() readonly statusChange = new EventEmitter<TaskStatus>();
  @Output() readonly logTime = new EventEmitter<void>();
  @Output() readonly complete = new EventEmitter<void>();
  @Output() readonly cancel = new EventEmitter<void>();

  protected comments: TaskComment[] = [];
  protected newCommentText = '';

  private readonly taskCommentsMap = new Map<string, TaskComment[]>();

  protected readonly currentUser: UserResult = {
    id: 'user-current',
    userName: 'denys_khomiak',
    fullName: 'Denys Khomiak',
    email: 'denys.khomiak@tasktracker.local',
  };

  protected readonly statuses: { key: TaskStatus; label: string }[] = [
    { key: 'Todo', label: 'To Do' },
    { key: 'InProgress', label: 'In Progress' },
    { key: 'InReview', label: 'In Review' },
    { key: 'Done', label: 'Done' },
    { key: 'Cancelled', label: 'Cancelled' },
  ];

  protected onClose(): void {
    this.closeBlade.emit();
  }

  protected onStatusChange(newStatus: TaskStatus): void {
    if (this._task && this._task.status !== newStatus) {
      this.statusChange.emit(newStatus);
    }
  }

  protected onLogTime(): void {
    this.logTime.emit();
  }

  protected onComplete(): void {
    this.complete.emit();
  }

  protected onCancel(): void {
    this.cancel.emit();
  }

  protected onCommentInput(value: string): void {
    this.newCommentText = value;
  }

  protected onAddComment(): void {
    const text = this.newCommentText.trim();
    if (!text || !this._task) return;

    const comment: TaskComment = {
      id: `comment-${Date.now()}`,
      taskId: this._task.id,
      author: this.currentUser,
      content: text,
      createdAt: new Date().toISOString(),
    };

    this.comments = [...this.comments, comment];
    this.taskCommentsMap.set(this._task.id, this.comments);
    this.newCommentText = '';
    this.cdr.markForCheck();
  }

  protected getAuthorInitial(author?: UserResult | null): string {
    if (!author) return '?';
    const name = author.fullName || author.userName || '';
    return name.charAt(0).toUpperCase() || '?';
  }

  protected getAssigneeName(): string {
    if (!this._task?.assignee) return 'Unassigned';
    return (
      this._task.assignee.fullName ||
      this._task.assignee.userName ||
      'Assigned User'
    );
  }

  protected getCreatorName(): string {
    if (!this._task?.createdBy) return 'System';
    return (
      this._task.createdBy.fullName ||
      this._task.createdBy.userName ||
      'Task Creator'
    );
  }

  protected getAssigneeInitial(): string {
    const name = this.getAssigneeName();
    return name === 'Unassigned' ? '?' : name.charAt(0).toUpperCase();
  }

  protected getCreatorInitial(): string {
    const name = this.getCreatorName();
    return name.charAt(0).toUpperCase() || 'U';
  }

  protected getTotalLoggedMinutes(): number {
    if (!this._task?.timeLogs?.length) return 0;
    return this._task.timeLogs.reduce(
      (acc, curr) => acc + (curr.minutesSpent || 0),
      0,
    );
  }

  private loadCommentsForTask(task: TaskDetailsResult | null): void {
    if (!task) {
      this.comments = [];
      this.newCommentText = '';
      return;
    }

    if (this.taskCommentsMap.has(task.id)) {
      this.comments = this.taskCommentsMap.get(task.id)!;
      return;
    }

    if (task.comments && task.comments.length > 0) {
      this.comments = [...task.comments];
      this.taskCommentsMap.set(task.id, this.comments);
      return;
    }

    const mockComments = this.generateMockComments(task);
    this.comments = mockComments;
    this.taskCommentsMap.set(task.id, mockComments);
  }

  private generateMockComments(task: TaskDetailsResult): TaskComment[] {
    const creatorUser = task.createdBy || {
      id: 'creator-fallback',
      userName: 'task_creator',
      fullName: 'Product Owner',
      email: 'owner@tasktracker.local',
    };

    const assigneeUser = task.assignee || {
      id: 'assignee-fallback',
      userName: 'lead_engineer',
      fullName: 'Lead Engineer',
      email: 'engineer@tasktracker.local',
    };

    const baseDate = task.createdAt ? new Date(task.createdAt) : new Date();

    const comments: TaskComment[] = [
      {
        id: `mock-c1-${task.id}`,
        taskId: task.id,
        author: creatorUser,
        content: `Created work item "${task.title}". Scope, acceptance criteria, and initial priorities have been attached.`,
        createdAt: new Date(baseDate.getTime() + 10 * 60000).toISOString(),
      },
      {
        id: `mock-c2-${task.id}`,
        taskId: task.id,
        author: assigneeUser,
        content:
          'Reviewed specifications. Technical architecture aligned and implementation is actively proceeding.',
        createdAt: new Date(baseDate.getTime() + 120 * 60000).toISOString(),
      },
    ];

    if (task.status === 'InReview' || task.status === 'Done') {
      comments.push({
        id: `mock-c3-${task.id}`,
        taskId: task.id,
        author: {
          id: 'qa-tester',
          userName: 'sarah_qa',
          fullName: 'Sarah Connor',
          email: 'sarah.qa@tasktracker.local',
        },
        content:
          'Verification and regression tests passed across all target criteria.',
        createdAt: new Date(baseDate.getTime() + 360 * 60000).toISOString(),
      });
    }

    return comments;
  }
}
