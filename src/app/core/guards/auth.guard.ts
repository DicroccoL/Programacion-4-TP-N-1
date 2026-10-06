import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Protege /mis-peliculas: permite entrar solo si hay un usuario autenticado.
export const authGuard: CanActivateFn = async (_route, state) => {
  // Obtenemos el estado de autenticación y el Router para redirigir.
  const auth = inject(AuthService);
  const router = inject(Router);

  // Esperamos que se recupere la sesión y se compruebe su vencimiento.
  await auth.whenReady();

  // Si hay un usuario autenticado, permitimos entrar a la ruta.
  if (auth.currentUser()) return true;

  // Si no hay sesión, enviamos al login y guardamos el destino en la URL.
  // Actualmente el componente de login no utiliza este parámetro redirect.
  return router.createUrlTree(['/login'], { queryParams: { redirect: state.url } });
};
