import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RegisterCredentials } from '../../models/user.model';

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

  onSubmit(event: Event): void {
    event.preventDefault();
    if (!this.nombre || !this.apellido || !this.email || !this.password || !this.fechaNacimiento) {
      return;
    }
    this.registerSubmit.emit({
      nombre: this.nombre,
      apellido: this.apellido,
      email: this.email,
      password: this.password,
      fechaNacimiento: this.fechaNacimiento,
    });
  }
}
