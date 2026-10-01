import { Directive, HostListener, Optional } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector:
    'input[formControlName]:not([type="password"]), input[formControl]:not([type="password"]), textarea[formControlName], textarea[formControl]',
  standalone: true,
})
export class AutoTrimDirective {
  constructor(@Optional() private readonly ngControl: NgControl) {}

  @HostListener('blur')
  onBlur(): void {
    if (!this.ngControl || !this.ngControl.control) return;
    const value = this.ngControl.control.value;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed !== value) {
        this.ngControl.control.setValue(trimmed);
        this.ngControl.control.updateValueAndValidity();
      }
    }
  }
}