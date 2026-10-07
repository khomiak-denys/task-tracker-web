import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TaskDetailsComponent } from './task-details.component';
import { TaskDetailsResult } from '../../../core/models/task.models';

describe('TaskDetailsComponent', () => {
  let component: TaskDetailsComponent;
  let fixture: ComponentFixture<TaskDetailsComponent>;

  const mockDetails: TaskDetailsResult = {
    id: 'task-101',
    title: 'Migrate to Azure DevOps Board',
    description: 'Break tasks into kanban columns and add status workflow',
    status: 'InProgress',
    priority: 'Critical',
    deadline: '2026-10-15T00:00:00Z',
    assigneeId: 'user-1',
    tags: ['DevOps', 'Frontend'],
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: null,
    createdBy: {
      id: 'creator-1',
      email: 'creator@example.com',
      userName: 'john_doe',
      fullName: 'John Doe',
    },
    assignee: {
      id: 'user-1',
      email: 'alex@example.com',
      userName: 'alex_dev',
      fullName: 'Alex Developer',
    },
    timeLogs: [
      {
        id: 'log-1',
        userId: 'user-1',
        minutesSpent: 90,
        description: 'Initial kanban board layout',
        loggedDate: '2026-10-01',
        createdAt: '2026-10-01T12:00:00Z',
      },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskDetailsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskDetailsComponent);
    component = fixture.componentInstance;
    component.task = mockDetails;
    component.isOpen = true;
    fixture.detectChanges();
  });

  it('Init_Should_CreateComponentAndDisplayTask_When_Provided', () => {
    expect(component).toBeTruthy();
    expect(component.task?.title).toBe('Migrate to Azure DevOps Board');
  });

  it('onClose_Should_EmitCloseBlade_When_Invoked', () => {
    spyOn(component.closeBlade, 'emit');
    component['onClose']();
    expect(component.closeBlade.emit).toHaveBeenCalled();
  });

  it('onStatusChange_Should_EmitStatusChange_When_NewStatusSelected', () => {
    spyOn(component.statusChange, 'emit');
    component['onStatusChange']('Done');
    expect(component.statusChange.emit).toHaveBeenCalledWith('Done');
  });

  it('onStatusChange_Should_NotEmit_When_SameStatusSelected', () => {
    spyOn(component.statusChange, 'emit');
    component['onStatusChange']('InProgress');
    expect(component.statusChange.emit).not.toHaveBeenCalled();
  });

  it('StateDropdown_Should_TriggerStatusChange_When_SelectionChanges', () => {
    spyOn(component.statusChange, 'emit');
    const selectEl: HTMLSelectElement = fixture.nativeElement.querySelector('#details-state-select');
    expect(selectEl).toBeTruthy();
    expect(selectEl.value).toBe('InProgress');

    selectEl.value = 'InReview';
    selectEl.dispatchEvent(new Event('change'));

    expect(component.statusChange.emit).toHaveBeenCalledWith('InReview');
  });

  it('onLogTime_Should_EmitLogTime_When_Invoked', () => {
    spyOn(component.logTime, 'emit');
    component['onLogTime']();
    expect(component.logTime.emit).toHaveBeenCalled();
  });

  it('onComplete_Should_EmitComplete_When_Invoked', () => {
    spyOn(component.complete, 'emit');
    component['onComplete']();
    expect(component.complete.emit).toHaveBeenCalled();
  });

  it('onCancel_Should_EmitCancel_When_Invoked', () => {
    spyOn(component.cancel, 'emit');
    component['onCancel']();
    expect(component.cancel.emit).toHaveBeenCalled();
  });

  it('Helpers_Should_ReturnCorrectNamesAndInitials_When_DataPresent', () => {
    expect(component['getAssigneeName']()).toBe('Alex Developer');
    expect(component['getAssigneeInitial']()).toBe('A');
    expect(component['getCreatorName']()).toBe('John Doe');
    expect(component['getCreatorInitial']()).toBe('J');
    expect(component['getTotalLoggedMinutes']()).toBe(90);
  });

  it('Helpers_Should_HandleNullValuesGracefully_When_NoAssigneeOrLogs', () => {
    component.task = {
      ...mockDetails,
      assignee: null,
      timeLogs: [],
    };
    fixture.detectChanges();

    expect(component['getAssigneeName']()).toBe('Unassigned');
    expect(component['getAssigneeInitial']()).toBe('?');
    expect(component['getTotalLoggedMinutes']()).toBe(0);
  });

  it('Comments_Should_BeEmpty_When_TaskHasNoPredefinedComments', () => {
    expect(component['comments']).toEqual([]);
  });

  it('Comments_Should_UseProvidedComments_When_TaskHasComments', () => {
    const customComments = [
      {
        id: 'c-custom-1',
        taskId: 'task-custom',
        author: {
          id: 'user-c',
          userName: 'custom_user',
          fullName: 'Custom User',
          email: 'custom@example.com',
        },
        content: 'Custom comment from test',
        createdAt: '2026-10-01T14:00:00Z',
      },
    ];

    component.task = {
      ...mockDetails,
      id: 'task-custom',
      comments: customComments,
    };
    fixture.detectChanges();

    expect(component['comments'].length).toBe(1);
    expect(component['comments'][0].content).toBe('Custom comment from test');
  });

  it('onCommentInput_Should_UpdateNewCommentText_When_UserTypes', () => {
    component['onCommentInput']('Reviewing task now');
    expect(component['newCommentText']).toBe('Reviewing task now');
  });

  it('onAddComment_Should_AppendCommentAndClearInput_When_ValidTextProvided', () => {
    const initialCount = component['comments'].length;
    component['onCommentInput']('Adding a test comment');
    component['onAddComment']();

    expect(component['comments'].length).toBe(initialCount + 1);
    const added = component['comments'][component['comments'].length - 1];
    expect(added.content).toBe('Adding a test comment');
    expect(added.author.fullName).toBe('Denys Khomiak');
    expect(component['newCommentText']).toBe('');
  });

  it('onAddComment_Should_DoNothing_When_TextIsWhitespaceOrEmpty', () => {
    const initialCount = component['comments'].length;
    component['onCommentInput']('   ');
    component['onAddComment']();

    expect(component['comments'].length).toBe(initialCount);
  });

  it('taskCommentsMap_Should_RetainCommentsAcrossBladeReopen_When_SameTaskIdProvided', () => {
    component['onCommentInput']('Persistent comment test');
    component['onAddComment']();
    const countWithNewComment = component['comments'].length;

    // Simulate switching away and switching back to task-101
    component.task = null;
    fixture.detectChanges();
    expect(component['comments'].length).toBe(0);

    component.task = mockDetails;
    fixture.detectChanges();
    expect(component['comments'].length).toBe(countWithNewComment);
    expect(component['comments'].some((c) => c.content === 'Persistent comment test')).toBeTrue();
  });

  it('getAuthorInitial_Should_ReturnQuestionMark_When_AuthorIsNull', () => {
    expect(component['getAuthorInitial'](null)).toBe('?');
  });
});
