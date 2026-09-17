import { Routes } from '@angular/router';
import { adminGuard } from './guards/admin.guard';
import { homeGuard } from './guards/home.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/inicio/inicio.component').then((m) => m.InicioComponent),
    canActivate: [homeGuard],
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./auth/auth.component').then((m) => m.AuthComponent),
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./pages/admin/admin.component').then((m) => m.AdminComponent),
    canActivate: [adminGuard],
  },
  { path: '**', redirectTo: '' },
];
