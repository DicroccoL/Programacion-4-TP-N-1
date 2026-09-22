import { Routes } from '@angular/router';
import { adminGuard } from './guards/admin.guard';
export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./componentes/componente-inicio/inicio.component').then((m) => m.InicioComponent),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./auth/auth.component').then((m) => m.AuthComponent),
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./componentes/componente-admin/admin.component').then((m) => m.AdminComponent),
    canActivate: [adminGuard],
  },
  { path: '**', redirectTo: '' },
];
