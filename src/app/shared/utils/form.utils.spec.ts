import { FormControl, FormGroup } from '@angular/forms';
import { trimFormGroup } from './form.utils';

describe('trimFormGroup', () => {
  it('should trim string fields in a form group', () => {
    const form = new FormGroup({
      username: new FormControl('   user123   '),
      email: new FormControl('  user@example.com  '),
    });

    trimFormGroup(form);

    expect(form.value.username).toBe('user123');
    expect(form.value.email).toBe('user@example.com');
  });

  it('should not trim excluded password fields', () => {
    const form = new FormGroup({
      username: new FormControl('   user123   '),
      password: new FormControl('   secret   '),
      confirmPassword: new FormControl('   secret   '),
    });

    trimFormGroup(form);

    expect(form.value.username).toBe('user123');
    expect(form.value.password).toBe('   secret   ');
    expect(form.value.confirmPassword).toBe('   secret   ');
  });
});
