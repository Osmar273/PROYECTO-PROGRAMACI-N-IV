import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login {
  credenciales = { correo: '', password: '' };
  mensajeError = '';
  cargando = false;
  mostrarPassword = false;
  
  // IP NUMÉRICA OBLIGATORIA (Evita el bloqueo de CORS en Windows)
  api = 'http://127.0.0.1:8000/api';

  constructor(
    private http: HttpClient, 
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    localStorage.removeItem('usuario_actual');
  }

  async iniciarSesion() {
    this.credenciales.correo = this.credenciales.correo.trim();
    this.credenciales.password = this.credenciales.password.trim();

    if (!this.credenciales.correo || !this.credenciales.password) {
      this.mensajeError = 'Ingresa correo y contraseña.';
      this.cdr.detectChanges();
      return;
    }

    this.cargando = true;
    this.mensajeError = '';
    this.cdr.detectChanges(); 

    try {
      const res: any = await firstValueFrom(
        this.http.post(`${this.api}/login`, this.credenciales)
      );
      
      this.cargando = false;
      this.cdr.detectChanges();
      
      localStorage.setItem('usuario_actual', JSON.stringify(res));

      const rutas: Record<string, string> = { admin: '/admin', docente: '/docente', estudiante: '/estudiante' };
      this.router.navigate([rutas[res.tipo_usuario] || '/login']);
    } catch (err: any) {
      this.cargando = false;
      
      if (err.status === 0) {
        this.mensajeError = 'Error CORS o de Red. Verifica la terminal del backend.';
      } else {
        this.mensajeError = err.error?.detail || 'Credenciales incorrectas.';
      }
      
      this.cdr.detectChanges(); 
    }
  }
}