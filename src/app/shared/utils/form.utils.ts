import { FormGroup } from '@angular/forms';

const DEFAULT_EXCLUDE_FIELDS = [
  'password',
  'confirmPassword',
  'currentPassword',
  'newPassword',
  'confirmNewPassword',
];

/**
 * Trims leading and trailing whitespace from string controls in a FormGroup.
 * Excludes sensitive fields like passwords by default.
 */
export function trimFormGroup(
  formGroup: FormGroup,
  excludeFields: string[] = DEFAULT_EXCLUDE_FIELDS,
): void {
  Object.keys(formGroup.controls).forEach((key) => {
    if (excludeFields.includes(key)) return;
    const control = formGroup.get(key);
    if (control && typeof control.value === 'string') {
      const trimmed = control.value.trim();
      if (trimmed !== control.value) {
        control.setValue(trimmed, { emitEvent: false });
        control.updateValueAndValidity({ emitEvent: false });
      }
    }
  });
}