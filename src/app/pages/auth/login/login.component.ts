import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CredencialesLogin } from '../../../models/user.model';

/** Formulario de acceso: valida que haya credenciales y las envía al padre. */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  /** Deshabilita los controles mientras el servicio procesa el inicio de sesión. */
  readonly isLoading = input<boolean>(false);

  /** Emite el correo y la contraseña para que el componente contenedor inicie sesión. */
  readonly loginSubmit = output<CredencialesLogin>();

  email = '';
  password = '';

  /** Evita el envío nativo del navegador y emite las credenciales si no están vacías. */
  onSubmit(event: Event): void {
    event.preventDefault();
    if (!this.email || !this.password) {
      return;
    }
    this.loginSubmit.emit({
      email: this.email,
      password: this.password,
    });
  }
}
