import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const staffGuard: CanActivateFn = async () => {
  const auth=inject(AuthService);const router=inject(Router);await auth.whenReady();
  if(auth.isAdmin()||auth.isEmpleado())return true;
  return router.createUrlTree(auth.isLoggedIn()?['/']:['/login']);
};
