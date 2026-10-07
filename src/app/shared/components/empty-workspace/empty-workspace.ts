import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Presentational component displayed when no workspaces are found
 * or when the backend returns a 404 response.
 */
@Component({
  selector: 'app-empty-workspace',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './empty-workspace.html',
  styleUrl: './empty-workspace.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyWorkspaceComponent {
  @Input() title: string = 'No Workspaces Found';
  @Input() description: string =
    "You don't have any workspaces yet. Create your first workspace to start collaborating on tasks, backlogs, and agile boards.";
  @Input() buttonText: string = 'Create First Workspace';

  @Output() readonly createWorkspace = new EventEmitter<void>();

  protected onCreateClick(): void {
    this.createWorkspace.emit();
  }
}
