import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { AdminDashboard } from './components/admin-dashboard/admin-dashboard';
import { DocenteDashboard } from './components/docente-dashboard/docente-dashboard';
import { EstudianteDashboard } from './components/estudiante-dashboard/estudiante-dashboard';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'admin', component: AdminDashboard, canActivate: [AuthGuard], data: { tipo_usuario: 'admin' } },
  { path: 'docente', component: DocenteDashboard, canActivate: [AuthGuard], data: { tipo_usuario: 'docente' } },
  { path: 'estudiante', component: EstudianteDashboard, canActivate: [AuthGuard], data: { tipo_usuario: 'estudiante' } },
  { path: '**', redirectTo: 'login' }
];
