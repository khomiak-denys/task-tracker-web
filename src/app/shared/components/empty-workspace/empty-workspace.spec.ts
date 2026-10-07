import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { EmptyWorkspaceComponent } from './empty-workspace';

describe('EmptyWorkspaceComponent', () => {
  let component: EmptyWorkspaceComponent;
  let fixture: ComponentFixture<EmptyWorkspaceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyWorkspaceComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EmptyWorkspaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render default title, description, and button text', () => {
    const titleEl = fixture.debugElement.query(By.css('.empty-title')).nativeElement;
    const descEl = fixture.debugElement.query(By.css('.empty-description')).nativeElement;
    const btnEl = fixture.debugElement.query(By.css('#btn-create-first-workspace')).nativeElement;

    expect(titleEl.textContent.trim()).toBe('No Workspaces Found');
    expect(descEl.textContent.trim()).toContain("You don't have any workspaces yet");
    expect(btnEl.textContent.trim()).toBe('Create First Workspace');
  });

  it('should render custom title and description when provided', () => {
    fixture.componentRef.setInput('title', 'Custom Title');
    fixture.componentRef.setInput('description', 'Custom Description Text');
    fixture.componentRef.setInput('buttonText', 'Add First Workspace');
    fixture.detectChanges();

    const titleEl = fixture.debugElement.query(By.css('.empty-title')).nativeElement;
    const descEl = fixture.debugElement.query(By.css('.empty-description')).nativeElement;
    const btnEl = fixture.debugElement.query(By.css('#btn-create-first-workspace')).nativeElement;

    expect(titleEl.textContent.trim()).toBe('Custom Title');
    expect(descEl.textContent.trim()).toBe('Custom Description Text');
    expect(btnEl.textContent.trim()).toBe('Add First Workspace');
  });

  it('should render the empty workspace logo SVG', () => {
    const svgEl = fixture.debugElement.query(By.css('.empty-logo-svg'));
    expect(svgEl).toBeTruthy();
    expect(svgEl.nativeElement.getAttribute('aria-label')).toBe('Empty workspace illustration');
  });

  it('should emit createWorkspace event when clicking the create first workspace button', () => {
    spyOn(component.createWorkspace, 'emit');

    const btn = fixture.debugElement.query(By.css('#btn-create-first-workspace'));
    btn.nativeElement.click();

    expect(component.createWorkspace.emit).toHaveBeenCalledTimes(1);
  });
});
