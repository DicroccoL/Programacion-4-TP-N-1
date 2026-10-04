import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { AdminPeliculasComponent } from './peliculas/admin-peliculas.component';
import { AdminSalasComponent } from './salas/admin-salas.component';
import { AdminFuncionesComponent } from './funciones/admin-funciones.component';
import { AdminConfiguracionComponent } from './configuracion/admin-configuracion.component';
import { AdminUsuariosComponent } from './usuarios/admin-usuarios.component';
import { AdminReportesComponent } from './reportes/admin-reportes.component';

export type SeccionAdmin =
  | 'peliculas'
  | 'salas'
  | 'funciones'
  | 'candybar'
  | 'configuracion'
  | 'usuarios'
  | 'reportes';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [AdminPeliculasComponent, AdminSalasComponent, AdminFuncionesComponent, AdminConfiguracionComponent, AdminUsuariosComponent, AdminReportesComponent],
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
