import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { AdminPeliculasComponent } from './admin-peliculas/admin-peliculas.component';

export type SeccionAdmin =
  | 'peliculas'
  | 'salas'
  | 'funciones'
  | 'candybar'
  | 'configuracion'
  | 'reportes';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [AdminPeliculasComponent],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css',
})
export class AdminComponent {
  readonly authService = inject(AuthService);
  // Señal que guarda qué pestaña está abierta (por defecto 'peliculas')
  readonly seccionActiva = signal<SeccionAdmin>('peliculas');

  cambiarSeccion(seccion: SeccionAdmin): void {
    this.seccionActiva.set(seccion);
  }
}
