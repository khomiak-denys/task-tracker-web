import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SkeletonVariant = 'workspace-card' | 'task-card' | 'task-row' | 'rect' | 'text';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './skeleton.component.html',
  styleUrl: './skeleton.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonComponent {
  @Input() variant: SkeletonVariant = 'rect';
  @Input() count: number = 1;

  get items(): number[] {
    const validCount = Math.max(1, Math.floor(this.count || 1));
    return Array.from({ length: validCount }, (_, i) => i);
  }
}
