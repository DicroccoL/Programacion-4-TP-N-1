import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Protege /validar-qr: permite entrar a administradores y empleados.
export const staffGuard: CanActivateFn = async () => {
  // Obtenemos el estado de autenticación y el Router para redirigir.
  const auth = inject(AuthService);
  const router = inject(Router);

  // Esperamos que se recupere la sesión y se compruebe su vencimiento.
  await auth.whenReady();

  // Si tiene alguno de los dos roles autorizados, permitimos entrar.
  if (auth.isAdmin() || auth.isEmpleado()) return true;

  // Si está autenticado sin esos roles, va al inicio; si no, al login.
  return router.createUrlTree(auth.isLoggedIn() ? ['/'] : ['/login']);
};
