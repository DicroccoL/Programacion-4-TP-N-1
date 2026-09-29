import { Component, input, output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CredencialesRegistro, TipoSangre } from '../../../models/user.model';
import { SelectorFechaComponent } from '../../../shared/components/selector-fecha/selector-fecha.component';

/** Formulario de alta que valida los datos y los entrega al componente padre. */
@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [ReactiveFormsModule, SelectorFechaComponent],
  templateUrl: './registro.component.html',
  styleUrl: './registro.component.css',
})
export class RegistroComponent {
  /** Deshabilita el formulario mientras se procesa el registro. */
  readonly isLoading = input<boolean>(false);

  /** Emite los datos validados para que el componente contenedor registre la cuenta. */
  readonly registerSubmit = output<CredencialesRegistro>();

  /** Opciones permitidas para los campos de sangre y color de ojos. */
  readonly tiposDeSangre: TipoSangre[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  readonly coloresDeOjos = ['Marrón', 'Azul', 'Verde', 'Gris', 'Negro', 'Avellana'];

  readonly registerForm: FormGroup;

  /** Construye el formulario reactivo y define las reglas de validación de cada campo. */
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

  /**
   * Si el formulario es inválido, marca sus controles para mostrar los errores.
   * Si es válido, convierte los días de vacaciones a número y emite los datos al padre.
   */
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
