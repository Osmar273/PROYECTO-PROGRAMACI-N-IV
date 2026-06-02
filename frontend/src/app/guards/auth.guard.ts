import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const userStr = localStorage.getItem('usuario_actual');
    if (!userStr) {
      this.router.navigate(['/login']);
      return false;
    }

    const user = JSON.parse(userStr);
    const expectedTipo = route.data['tipo_usuario'];

    if (expectedTipo && user.tipo_usuario !== expectedTipo) {
      if (user.tipo_usuario === 'admin') this.router.navigate(['/admin']);
      else if (user.tipo_usuario === 'docente') this.router.navigate(['/docente']);
      else if (user.tipo_usuario === 'estudiante') this.router.navigate(['/estudiante']);
      else this.router.navigate(['/login']);
      return false;
    }

    return true;
  }
}
