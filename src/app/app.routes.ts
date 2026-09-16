import { Routes } from '@angular/router';
import { InicioComponent } from './pages/inicio/inicio.component';
import { AuthComponent } from './auth/auth.component';
import { AdminComponent } from './pages/admin/admin.component';
import { adminGuard } from './guards/admin.guard';
import { homeGuard } from './guards/home.guard';

export const routes: Routes = [
  { path: '', component: InicioComponent, canActivate: [homeGuard] },
  { path: 'login', component: AuthComponent },
  { path: 'admin', component: AdminComponent, canActivate: [adminGuard] },
  { path: '**', redirectTo: '' },
];
