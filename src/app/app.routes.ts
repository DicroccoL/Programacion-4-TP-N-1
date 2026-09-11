import { Routes } from '@angular/router';
import { InicioComponent } from './pages/inicio/inicio.component';
import { AuthComponent } from './auth/auth.component';

export const routes: Routes = [
  { path: '', component: InicioComponent },
  { path: 'login', component: AuthComponent },
  { path: '**', redirectTo: '' },
];
