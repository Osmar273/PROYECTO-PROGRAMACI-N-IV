import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { EstudianteService } from '../../services/estudiante';
import { ToastService } from '../../services/toast';

@Component({
  selector: 'app-estudiante-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './estudiante-dashboard.html',
  styleUrls: ['./estudiante-dashboard.css']
})
export class EstudianteDashboard implements OnInit {
  vistaActual: string = 'oferta';
  usuarioActual: any = null;
  sidebarAbierto = false;

  gruposDisponibles: any[] = [];
  misInscripciones: any[] = [];
  materias: any[] = [];

  // Datos para el perfil
  perfilEdit = { direccion: '', telefonoEmergencia: '', telefono: '' };
  archivoFoto: File | null = null;

  constructor(
    private router: Router, 
    private estudianteService: EstudianteService, 
    private toast: ToastService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    const userStr = localStorage.getItem('usuario_actual');
    if (userStr) {
      this.usuarioActual = JSON.parse(userStr);
      // Llenamos el formulario de perfil con los datos existentes
      this.perfilEdit.direccion = this.usuarioActual.direccion || '';
      this.perfilEdit.telefonoEmergencia = this.usuarioActual.telefonoEmergencia || '';
      this.perfilEdit.telefono = this.usuarioActual.telefono || '';
      this.cargarDatos();
    } else {
      this.router.navigate(['/login']);
    }
  }

  toggleSidebar() { this.sidebarAbierto = !this.sidebarAbierto; }
  cambiarVista(vista: string) { this.vistaActual = vista; this.sidebarAbierto = false; }
  cerrarSesion() { localStorage.removeItem('usuario_actual'); this.router.navigate(['/login']); }

  cargarDatos() {
    this.estudianteService.getMaterias().subscribe(mat => this.materias = mat);
    this.estudianteService.getGruposDisponibles().subscribe(grupos => {
      this.gruposDisponibles = grupos.map(g => {
        const materia = this.materias.find(m => m.id_materia === g.id_materia);
        return { ...g, nombreMateria: materia ? materia.nombre : '', codigoMateria: materia ? materia.codigo : '' };
      });
    });
    this.cargarMisInscripciones();
  }

  cargarMisInscripciones() {
    this.estudianteService.getMisInscripciones(this.usuarioActual.id_usuario).subscribe(ins => {
      this.misInscripciones = ins;
    });
  }

  inscribir(grupo: any) {
    if (!confirm(`¿Deseas inscribirte en ${grupo.nombreMateria}?`)) return;
    const payload = { id_estudiante: this.usuarioActual.id_usuario, id_grupo: grupo.id_grupo, fecha: new Date().toISOString().split('T')[0], estado: 'Cursando' };
    
    this.estudianteService.inscribirMateria(payload).subscribe({
      next: () => {
        this.toast.success('¡Inscripción exitosa!');
        this.cargarDatos();
      },
      error: (err) => this.toast.error(err.error?.detail || 'Error al inscribir')
    });
  }

  // ==========================================
  // GESTIÓN DE PERFIL Y FOTO
  // ==========================================
  seleccionarFoto(event: any) {
    this.archivoFoto = event.target.files[0];
  }

  subirFoto() {
    if (!this.archivoFoto) return this.toast.warning('Selecciona una imagen primero');
    const formData = new FormData();
    formData.append('file', this.archivoFoto);

    this.http.post(`http://127.0.0.1:8000/api/usuarios/${this.usuarioActual.id_usuario}/foto`, formData).subscribe({
      next: (res: any) => {
        this.usuarioActual.fotoPerfil = res.fotoPerfil;
        localStorage.setItem('usuario_actual', JSON.stringify(this.usuarioActual));
        this.toast.success('Foto de perfil actualizada');
        this.archivoFoto = null;
      },
      error: () => this.toast.error('Error al subir la foto')
    });
  }

  actualizarPerfil() {
    this.http.put(`http://127.0.0.1:8000/api/usuarios/${this.usuarioActual.id_usuario}/perfil`, this.perfilEdit).subscribe({
      next: () => {
        this.usuarioActual.direccion = this.perfilEdit.direccion;
        this.usuarioActual.telefonoEmergencia = this.perfilEdit.telefonoEmergencia;
        this.usuarioActual.telefono = this.perfilEdit.telefono;
        localStorage.setItem('usuario_actual', JSON.stringify(this.usuarioActual));
        this.toast.success('Datos de contacto actualizados');
      },
      error: () => this.toast.error('Error al actualizar datos')
    });
  }
}