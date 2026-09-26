import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  // Espera a que Supabase confirme si hay una sesión activa y qué rol tiene
  await authService.whenReady();
  
  // Si es admin devuelve true (lo deja pasar)
  // Si NO es admin, genera una redirección hacia la ruta de Inicio '/'
  return authService.isAdmin() ? true : router.createUrlTree(['/']);
};
