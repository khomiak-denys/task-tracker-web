import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { AutoTrimDirective } from './auto-trim.directive';

@Component({
  standalone: true,
  imports: [AutoTrimDirective, ReactiveFormsModule],
  template: `
    <input type="text" [formControl]="textControl" id="text-input" />
    <input type="password" [formControl]="passwordControl" id="password-input" />
  `,
})
class TestHostComponent {
  textControl = new FormControl('   untrimmed text   ');
  passwordControl = new FormControl('   secret   ');
}

describe('AutoTrimDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let component: TestHostComponent;
  let textInput: HTMLInputElement;
  let passwordInput: HTMLInputElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    textInput = fixture.nativeElement.querySelector('#text-input');
    passwordInput = fixture.nativeElement.querySelector('#password-input');
  });

  it('should trim whitespace on text input blur', () => {
    textInput.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(component.textControl.value).toBe('untrimmed text');
  });

  it('should not trim password input', () => {
    passwordInput.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(component.passwordControl.value).toBe('   secret   ');
  });
});
