import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Workspace } from '../../../core/models/workspace.models';

@Component({
  selector: 'app-workspace-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './workspace-selector.html',
  styleUrl: './workspace-selector.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceSelectorComponent {
  private readonly elementRef = inject(ElementRef);

  @Input() workspaces: Workspace[] = [];
  @Input() selectedWorkspace: Workspace | null = null;

  @Output() readonly workspaceChange = new EventEmitter<Workspace>();
  @Output() readonly createWorkspace = new EventEmitter<void>();

  protected isDropdownOpen = false;
  protected searchQuery = '';

  get filteredWorkspaces(): Workspace[] {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) {
      return this.workspaces;
    }
    return this.workspaces.filter(
      (w) =>
        w.name.toLowerCase().includes(query) ||
        w.code.toLowerCase().includes(query) ||
        w.description.toLowerCase().includes(query) ||
        w.role.toLowerCase().includes(query),
    );
  }

  protected toggleDropdown(event?: Event): void {
    event?.stopPropagation();
    this.isDropdownOpen = !this.isDropdownOpen;
    if (!this.isDropdownOpen) {
      this.searchQuery = '';
    }
  }

  protected closeDropdown(): void {
    if (this.isDropdownOpen) {
      this.isDropdownOpen = false;
      this.searchQuery = '';
    }
  }

  protected onSelectWorkspace(workspace: Workspace, event?: Event): void {
    event?.stopPropagation();
    if (this.selectedWorkspace?.id !== workspace.id) {
      this.workspaceChange.emit(workspace);
    }
    this.closeDropdown();
  }

  protected onCreateWorkspace(event?: Event): void {
    event?.stopPropagation();
    this.createWorkspace.emit();
    this.closeDropdown();
  }

  protected onSearchInput(event: Event): void {
    event.stopPropagation();
    const input = event.target as HTMLInputElement;
    this.searchQuery = input.value;
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (this.isDropdownOpen && !this.elementRef.nativeElement.contains(event.target)) {
      this.closeDropdown();
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscapePress(): void {
    this.closeDropdown();
  }

  getWorkspaceInitial(ws?: Workspace | null): string {
    if (!ws?.name) return 'W';
    const trimmed = ws.name.trim();
    return trimmed ? trimmed.charAt(0).toUpperCase() : 'W';
  }
}
