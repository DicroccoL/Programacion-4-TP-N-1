import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth';
import { SoloAdminDirective } from '../../directivas/solo-admin.directive';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SoloAdminDirective],
  templateUrl: './app-layout.component.html',
  styleUrl: './app-layout.component.css',
})
export class AppLayoutComponent {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  async cerrarSesion(): Promise<void> {
    await this.authService.logout();
    await this.router.navigate(['/']);
  }
}
