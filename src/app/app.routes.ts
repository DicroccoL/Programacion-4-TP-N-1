import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/inicio/inicio.component').then((m) => m.InicioComponent),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/auth/auth.component').then((m) => m.AuthComponent),
  },
  {
    path: 'pelicula/:id',
    loadComponent: () =>
      import('./pages/detalle-pelicula/detalle-pelicula.component').then(
        (m) => m.DetallePeliculaComponent,
      ),
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./pages/admin/admin.component').then((m) => m.AdminComponent),
    canActivate: [adminGuard],
    //aca usamos el guard  que espera la autorizacion.
  },
  { path: '**', redirectTo: '' },
];
