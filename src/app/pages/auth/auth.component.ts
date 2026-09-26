import { Component, inject, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LoginComponent } from './login/login.component';
import { RegistroComponent } from './registro/registro.component';
import { CredencialesLogin, CredencialesRegistro } from '../../models/user.model';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [LoginComponent, RegistroComponent],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css',
})
export class AuthComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  tab: 'login' | 'register' = 'login';
  errorMessage: string | null = null;
  successMessage: string | null = null;

  ngOnInit(): void {
    // If a query param ?tab=register is present, switch to registration view
    const tabParam = this.route.snapshot.queryParamMap.get('tab');
    if (tabParam === 'register') {
      this.tab = 'register';
    }
  }

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
