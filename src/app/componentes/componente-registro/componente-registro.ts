import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RegisterCredentials, TipoSangre } from '../../models/user.model';

@Component({
  selector: 'app-componente-registro',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './componente-registro.html',
  styleUrl: './componente-registro.css',
})
export class ComponenteRegistro {
  readonly isLoading = input<boolean>(false);
  readonly registerSubmit = output<RegisterCredentials>();

  nombre = '';
  apellido = '';
  email = '';
  password = '';
  fechaNacimiento = '';
  tipoSangre = '';
  colorOjos = '';
  diasVacacionesAnio: number | null = null;

  readonly tiposDeSangre: TipoSangre[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  readonly coloresDeOjos = ['Marrón', 'Azul', 'Verde', 'Gris', 'Negro', 'Avellana'];

  onSubmit(event: Event): void {
    event.preventDefault();
    if (
      !this.nombre ||
      !this.apellido ||
      !this.email ||
      !this.password ||
      !this.fechaNacimiento ||
      !this.tipoSangre ||
      !this.colorOjos ||
      this.diasVacacionesAnio === null ||
      this.diasVacacionesAnio < 0
    ) {
      return;
    }
    this.registerSubmit.emit({
      nombre: this.nombre,
      apellido: this.apellido,
      email: this.email,
      password: this.password,
      fechaNacimiento: this.fechaNacimiento,
      tipoSangre: this.tipoSangre,
      colorOjos: this.colorOjos,
      diasVacacionesAnio: Number(this.diasVacacionesAnio),
    });
  }
}

