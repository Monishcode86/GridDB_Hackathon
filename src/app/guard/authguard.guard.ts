import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const authguardGuard: CanActivateFn = (route, state) => {

  const router = inject(Router)

  const isLoggedIn = !!sessionStorage.getItem('token')

  if (isLoggedIn) {
    return true
  } else {
    router.navigate(['/login']);
    return false;
  }
};
