import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DocenteService } from '../../services/docente';
import { ToastService } from '../../services/toast';

@Component({
  selector: 'app-docente-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './docente-dashboard.html',
  styleUrls: ['./docente-dashboard.css']
})
export class DocenteDashboard implements OnInit {
  vistaActual: string = 'mis-grupos';
  usuarioActual: any = null;
  sidebarAbierto = false;

  materias: any[] = []; todosLosGrupos: any[] = []; misGrupos: any[] = [];
  estudiantes: any[] = []; inscripciones: any[] = [];
  grupoSeleccionado: any = null; listaAlumnosGrupo: any[] = [];

  // Datos para el perfil
  perfilEdit = { direccion: '', telefonoEmergencia: '', telefono: '' }; // telefono no se usa en docente, pero previene errores
  archivoFoto: File | null = null;

  constructor(private router: Router, private docenteService: DocenteService, private toast: ToastService, private http: HttpClient) {}

  ngOnInit() {
    const userStr = localStorage.getItem('usuario_actual');
    if (userStr) {
      this.usuarioActual = JSON.parse(userStr);
      this.perfilEdit.direccion = this.usuarioActual.direccion || '';
      this.perfilEdit.telefonoEmergencia = this.usuarioActual.telefonoEmergencia || '';
      this.cargarDatosDocente();
    } else {
      this.router.navigate(['/login']);
    }
  }

  toggleSidebar() { this.sidebarAbierto = !this.sidebarAbierto; }
  cambiarVista(vista: string) { this.vistaActual = vista; this.sidebarAbierto = false; }
  cerrarSesion() { localStorage.removeItem('usuario_actual'); this.router.navigate(['/login']); }

  cargarDatosDocente() {
    this.docenteService.getMaterias().subscribe(mat => {
      this.materias = mat;
      this.docenteService.getGrupos().subscribe(grupos => {
        this.misGrupos = grupos.filter(g => g.id_docente === this.usuarioActual.id_usuario).map(g => {
            const materia = this.materias.find(m => m.id_materia === g.id_materia);
            return { ...g, nombreMateria: materia ? materia.nombre : '', codigoMateria: materia ? materia.codigo : '' };
          });
      });
    });
    this.docenteService.getEstudiantes().subscribe(est => this.estudiantes = est);
    this.docenteService.getInscripciones().subscribe(ins => this.inscripciones = ins);
  }

  abrirCalificador(grupo: any) {
    this.grupoSeleccionado = grupo;
    const inscripcionesDelGrupo = this.inscripciones.filter(ins => ins.id_grupo === grupo.id_grupo);
    this.listaAlumnosGrupo = inscripcionesDelGrupo.map(ins => {
      const estudiante = this.estudiantes.find(e => e.id_usuario === ins.id_estudiante);
      return { ...ins, codEstudiante: estudiante ? estudiante.codEstudiante : 'N/A', nombresEstudiante: estudiante ? `${estudiante.nombres} ${estudiante.apellidos}` : 'Desconocido', notaFinalInput: ins.nota || 0 };
    });
    this.cambiarVista('calificador');
  }

  guardarNota(alumno: any) {
    if (alumno.notaFinalInput < 0 || alumno.notaFinalInput > 100) return this.toast.warning('La nota debe estar entre 0 y 100.');
    const estadoAprobacion = alumno.notaFinalInput >= 51 ? 'Aprobado' : 'Reprobado';
    
    this.docenteService.actualizarEstadoInscripcion(alumno.id_inscripcion, { estado: estadoAprobacion }).subscribe({
      next: () => {
        alumno.estado = estadoAprobacion;
        const payloadNota = { id_inscripcion: alumno.id_inscripcion, nota: alumno.notaFinalInput, observacion: 'Nota Final' };
        this.docenteService.guardarNotaFinal(payloadNota).subscribe({
            next: () => this.toast.success(`Calificación guardada para ${alumno.nombresEstudiante}`),
            error: () => this.toast.warning(`Estado actualizado, pero hubo un error con el registro numérico.`)
        });
      },
      error: () => this.toast.error('Error al guardar.')
    });
  }

  // ==========================================
  // GESTIÓN DE PERFIL Y FOTO
  // ==========================================
  seleccionarFoto(event: any) { this.archivoFoto = event.target.files[0]; }

  subirFoto() {
    if (!this.archivoFoto) return;
    const formData = new FormData(); formData.append('file', this.archivoFoto);
    this.http.post(`http://127.0.0.1:8000/api/usuarios/${this.usuarioActual.id_usuario}/foto`, formData).subscribe({
      next: (res: any) => {
        this.usuarioActual.fotoPerfil = res.fotoPerfil;
        localStorage.setItem('usuario_actual', JSON.stringify(this.usuarioActual));
        this.toast.success('Foto de perfil actualizada');
      },
      error: () => this.toast.error('Error al subir la foto')
    });
  }

  actualizarPerfil() {
    this.http.put(`http://127.0.0.1:8000/api/usuarios/${this.usuarioActual.id_usuario}/perfil`, this.perfilEdit).subscribe({
      next: () => {
        this.usuarioActual.direccion = this.perfilEdit.direccion;
        this.usuarioActual.telefonoEmergencia = this.perfilEdit.telefonoEmergencia;
        localStorage.setItem('usuario_actual', JSON.stringify(this.usuarioActual));
        this.toast.success('Perfil actualizado correctamente');
      },
      error: () => this.toast.error('Error al actualizar datos')
    });
  }
}