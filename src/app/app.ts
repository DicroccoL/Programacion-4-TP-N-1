import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  async cerrarSesion(): Promise<void> {
    await this.authService.logout();
    this.router.navigate(['/']);
  }
}
