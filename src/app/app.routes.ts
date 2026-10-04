import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';
import { staffGuard } from './core/guards/staff.guard';

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
    path: 'funciones/:id/butacas',
    loadComponent: () => import('./pages/butacas/butacas.component').then((m) => m.ButacasComponent),
  },
  {
    path: 'ticket/:id',
    loadComponent: () => import('./pages/ticket/ticket.component').then((m) => m.TicketComponent),
  },
  {
    path: 'mis-peliculas',
    loadComponent: () => import('./pages/mis-peliculas/mis-peliculas.component').then((m) => m.MisPeliculasComponent),
    canActivate: [authGuard],
  },
  {
    path: 'validar-qr',
    loadComponent: () => import('./pages/validar-qr/validar-qr.component').then((m) => m.ValidarQrComponent),
    canActivate: [staffGuard],
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
