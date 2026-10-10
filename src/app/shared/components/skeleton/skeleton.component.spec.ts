import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SkeletonComponent } from './skeleton.component';

describe('SkeletonComponent', () => {
  let component: SkeletonComponent;
  let fixture: ComponentFixture<SkeletonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkeletonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SkeletonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('Init_Should_CreateComponent', () => {
    expect(component).toBeTruthy();
    expect(component.variant).toBe('rect');
    expect(component.count).toBe(1);
    expect(component.items.length).toBe(1);
  });

  it('Items_Should_ReturnArrayMatchingCount', () => {
    component.count = 4;
    expect(component.items).toEqual([0, 1, 2, 3]);
  });

  it('Items_Should_DefaultToOne_When_CountZeroOrNegative', () => {
    component.count = 0;
    expect(component.items.length).toBe(1);

    component.count = -3;
    expect(component.items.length).toBe(1);
  });

  it('Render_Should_DisplayWorkspaceCards_When_VariantIsWorkspaceCard', () => {
    fixture.componentRef.setInput('variant', 'workspace-card');
    fixture.componentRef.setInput('count', 3);
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.skeleton-workspace-card');
    expect(cards.length).toBe(3);

    const badges = fixture.nativeElement.querySelectorAll('.skeleton-badge');
    expect(badges.length).toBe(3);
  });

  it('Render_Should_DisplayTaskCards_When_VariantIsTaskCard', () => {
    fixture.componentRef.setInput('variant', 'task-card');
    fixture.componentRef.setInput('count', 2);
    fixture.detectChanges();

    const taskCards = fixture.nativeElement.querySelectorAll('.skeleton-task-card');
    expect(taskCards.length).toBe(2);

    const priorities = fixture.nativeElement.querySelectorAll('.skeleton-priority-pill');
    expect(priorities.length).toBe(2);
  });

  it('Render_Should_DisplayTableRows_When_VariantIsTaskRow', () => {
    fixture.componentRef.setInput('variant', 'task-row');
    fixture.componentRef.setInput('count', 4);
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('.skeleton-table-row');
    expect(rows.length).toBe(4);
  });

  it('Render_Should_DisplayRect_When_VariantIsRectOrText', () => {
    fixture.componentRef.setInput('variant', 'rect');
    fixture.componentRef.setInput('count', 2);
    fixture.detectChanges();

    let rects = fixture.nativeElement.querySelectorAll('.skeleton-rect');
    expect(rects.length).toBe(2);

    fixture.componentRef.setInput('variant', 'text');
    fixture.detectChanges();

    rects = fixture.nativeElement.querySelectorAll('.skeleton-rect.skeleton-text');
    expect(rects.length).toBe(2);
  });
});
