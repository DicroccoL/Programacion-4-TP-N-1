import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { ComponenteLogin } from '../componentes/componente-login/componente-login';
import { ComponenteRegistro } from '../componentes/componente-registro/componente-registro';
import { CredencialesLogin, CredencialesRegistro } from '../models/user.model';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [ComponenteLogin, ComponenteRegistro],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css',
})
export class AuthComponent {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  tab: 'login' | 'register' = 'login';
  errorMessage: string | null = null;
  successMessage: string | null = null;

  cambiarTab(nuevaTab: 'login' | 'register'): void {
    this.tab = nuevaTab;
    this.errorMessage = null;
    this.successMessage = null;
  }

  async handleLogin(credentials: CredencialesLogin): Promise<void> {
    this.errorMessage = null;
    this.successMessage = null;

    const result = await this.authService.login(credentials);

    if (result.success) {
      this.successMessage = '¡Inicio de sesión exitoso!';
      await this.router.navigate([this.authService.isAdmin() ? '/admin' : '/']);
    } else {
      this.errorMessage = result.error ?? 'Error al iniciar sesión. Verifica tus credenciales.';
    }
  }

  async handleRegister(credentials: CredencialesRegistro): Promise<void> {
    this.errorMessage = null;
    this.successMessage = null;

    const result = await this.authService.register(credentials);

    if (result.success) {
      this.successMessage = '¡Cuenta creada con éxito!';
      await this.router.navigate(['/']);
    } else {
      this.errorMessage = result.error ?? 'Error al registrar la cuenta.';
    }
  }
}
