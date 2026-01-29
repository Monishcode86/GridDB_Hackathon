import { Routes } from '@angular/router';
import { authguardGuard } from './guard/authguard.guard';

export const routes: Routes = [
  {
    path: '',
    canActivate:[authguardGuard],
    loadComponent: () => import('./layouts/admin-layout/admin-layout.component')
      .then(m => m.AdminLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'energydashboard', loadComponent: () => import('./pages/energy-dashboard/energy-dashboard.component').then(m=>m.EnergyDashboardComponent) },
      {
        path: 'settings',
        children: [
          { path: '', redirectTo: 'user', pathMatch: 'full' },
          { path: 'device', loadComponent: () => import('./pages/settings/devices/devices.component').then(m => m.DevicesComponent) },
        ]
      }

    ]
  },
  {
    path:'login',
    loadComponent:()=>import('./auth/login/login.component').then(m=>m.LoginComponent)
  },
  {
    path:'**',
    redirectTo: ''
  }
];
