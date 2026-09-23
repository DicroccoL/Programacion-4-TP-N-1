import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CredencialesLogin } from '../../models/user.model';

@Component({
  selector: 'app-componente-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './componente-login.html',
  styleUrl: './componente-login.css',
})
export class ComponenteLogin {
  // Input opcional para deshabilitar botones si el padre está procesando
  readonly isLoading = input<boolean>(false);

  // Evento que emite las credenciales limpias al componente padre
  readonly loginSubmit = output<CredencialesLogin>();

  email = '';
  password = '';

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
