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

    this.comments = [];
  }
}
