import { Component, input, output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CredencialesRegistro, TipoSangre } from '../../../models/user.model';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './registro.component.html',
  styleUrl: './registro.component.css',
})
export class RegistroComponent {
  readonly isLoading = input<boolean>(false);
  readonly registerSubmit = output<CredencialesRegistro>();

  readonly tiposDeSangre: TipoSangre[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  readonly coloresDeOjos = ['Marrón', 'Azul', 'Verde', 'Gris', 'Negro', 'Avellana'];

  readonly registerForm: FormGroup;

  constructor(private readonly fb: FormBuilder) {
    this.registerForm = this.fb.nonNullable.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      fechaNacimiento: ['', [Validators.required]],
      tipoSangre: ['', [Validators.required]],
      colorOjos: ['', [Validators.required]],
      diasVacacionesAnio: [null as number | null, [Validators.required, Validators.min(0), Validators.max(365)]],
    });
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const { value } = this.registerForm;

    this.registerSubmit.emit({
      nombre: value.nombre ?? '',
      apellido: value.apellido ?? '',
      email: value.email ?? '',
      password: value.password ?? '',
      fechaNacimiento: value.fechaNacimiento ?? '',
      tipoSangre: value.tipoSangre ?? '',
      colorOjos: value.colorOjos ?? '',
      diasVacacionesAnio: Number(value.diasVacacionesAnio ?? 0),
    });
  }
}
