import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { EstudianteService } from '../../services/estudiante';
import { ToastService } from '../../services/toast';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  sidebarAbierto: boolean = false;

  gruposDisponibles: any[] = [];
  materias: any[] = [];
  historialAcademico: any[] = [];
  aulas: any[] = []; // Para traducir el ID a nombre de aula real

  perfilEdit: any = { direccion: '', telefonoEmergencia: '', telefono: '' };
  archivoFoto: File | null = null;

  constructor(
    private router: Router, 
    private estudianteService: EstudianteService, 
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const userStr = localStorage.getItem('usuario_actual');
    if (userStr) {
      this.usuarioActual = JSON.parse(userStr);
      this.perfilEdit.direccion = this.usuarioActual.direccion || '';
      this.perfilEdit.telefonoEmergencia = this.usuarioActual.telefonoEmergencia || '';
      this.perfilEdit.telefono = this.usuarioActual.telefono || '';
      
      // Cargamos Aulas y Materias primero para evitar fallos de sincronización
      this.http.get<any[]>('http://127.0.0.1:8000/api/aulas').subscribe((a: any[]) => {
        this.aulas = a;
        this.estudianteService.getMaterias().subscribe((mat: any[]) => {
          this.materias = mat;
          this.cargarDatos();
          this.cargarHistorial();
        });
      });
    } else {
      this.router.navigate(['/login']);
    }
  }

  toggleSidebar(): void { this.sidebarAbierto = !this.sidebarAbierto; this.cdr.detectChanges(); }
  cambiarVista(vista: string): void { this.vistaActual = vista; this.sidebarAbierto = false; this.cdr.detectChanges(); }
  cerrarSesion(): void { localStorage.removeItem('usuario_actual'); this.router.navigate(['/login']); }

  getNombreAula(idAula: number): string { 
    const au = this.aulas.find((a: any) => a.id_aula === idAula); 
    return au ? `${au.nombre} (${au.edificio})` : 'Sin Aula Asignada'; 
  }

  cargarDatos(): void {
    this.estudianteService.getGruposDisponibles().subscribe((grupos: any[]) => {
      this.gruposDisponibles = grupos.map((g: any) => {
        const materia = this.materias.find((m: any) => m.id_materia === g.id_materia);
        return { ...g, nombreMateria: materia ? materia.nombre : '', codigoMateria: materia ? materia.codigo : '' };
      });
      this.cdr.detectChanges();
    });
  }

  // ==========================================
  // HISTORIAL Y KARDEX (Actualizado con Horarios)
  // ==========================================
  cargarHistorial(): void {
    this.http.get<any[]>(`http://127.0.0.1:8000/api/inscripciones/estudiante/${this.usuarioActual.id_usuario}`).subscribe((inscripciones: any[]) => {
      this.http.get<any[]>('http://127.0.0.1:8000/api/grupos').subscribe((grupos: any[]) => {
        this.http.get<any[]>('http://127.0.0.1:8000/api/notas').subscribe((notas: any[]) => {
          this.http.get<any[]>('http://127.0.0.1:8000/api/periodos').subscribe((periodos: any[]) => {

            this.historialAcademico = inscripciones.map((ins: any) => {
              const grupo = grupos.find((g: any) => g.id_grupo === ins.id_grupo) || {};
              const materia = this.materias.find((m: any) => m.id_materia === grupo.id_materia) || {};
              const notaObj = notas.find((n: any) => n.id_inscripcion === ins.id_inscripcion) || {};
              const periodo = periodos.find((p: any) => p.id_periodo === grupo.id_periodo) || {};

              return {
                sigla: materia.codigo || 'N/A',
                materia: materia.nombre || 'Desconocida',
                seccion: grupo.seccion || 'N/A',
                gestion: periodo.nombre || 'N/A',
                notaFinal: notaObj.nota !== undefined ? notaObj.nota : 'Sin nota',
                estado: ins.estado || 'Cursando',
                // AGREGADO: Turno, Aula y Horario para mostrar en la UI
                turno: grupo.turno || 'N/A',
                id_aula: grupo.id_aula,
                horaInicio: grupo.horaInicio,
                horaFin: grupo.horaFin
              };
            });
            this.cdr.detectChanges();
          });
        });
      });
    });
  }

  descargarKardex(): void {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('KARDEX ACADÉMICO', 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Estudiante: ${this.usuarioActual.nombres} ${this.usuarioActual.apellidos}`, 14, 30);
    doc.text(`Matrícula / CI: ${this.usuarioActual.ci}`, 14, 36);
    doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString()}`, 14, 42);

    const data = this.historialAcademico.map((h: any) => [h.sigla, h.materia, h.gestion, h.notaFinal, h.estado]);
    
    autoTable(doc, {
      head: [['Sigla', 'Asignatura', 'Periodo', 'Nota Final', 'Estado']],
      body: data,
      startY: 50,
      theme: 'grid',
      headStyles: { fillColor: [25, 135, 84] } // Color verde de Bootstrap
    });

    doc.save(`Kardex_${this.usuarioActual.ci}.pdf`);
    this.toast.success('Kardex descargado correctamente');
  }

  inscribir(grupo: any): void {
    if (!confirm(`¿Deseas inscribirte en ${grupo.nombreMateria}?`)) return;
    const payload = { id_estudiante: this.usuarioActual.id_usuario, id_grupo: grupo.id_grupo, fecha: new Date().toISOString().split('T')[0], estado: 'Cursando' };
    
    this.estudianteService.inscribirMateria(payload).subscribe({
      next: () => {
        this.toast.success('¡Inscripción exitosa!');
        this.cargarDatos();
        this.cargarHistorial(); // Actualiza la tabla de historial al instante
      },
      error: (err: any) => this.toast.error(err.error?.detail || 'Error al inscribir')
    });
  }

  // ==========================================
  // PERFIL
  // ==========================================
  seleccionarFoto(event: any): void { this.archivoFoto = event.target.files[0]; this.cdr.detectChanges(); }

  subirFoto(): void {
    if (!this.archivoFoto) { this.toast.warning('Selecciona una imagen primero'); return; }
    const formData = new FormData(); formData.append('file', this.archivoFoto);

    this.http.post(`http://127.0.0.1:8000/api/usuarios/${this.usuarioActual.id_usuario}/foto`, formData).subscribe({
      next: (res: any) => {
        this.usuarioActual.fotoPerfil = res.fotoPerfil; localStorage.setItem('usuario_actual', JSON.stringify(this.usuarioActual));
        this.toast.success('Foto actualizada'); this.archivoFoto = null; this.cdr.detectChanges();
      }, error: () => this.toast.error('Error al subir la foto')
    });
  }

  actualizarPerfil(): void {
    this.http.put(`http://127.0.0.1:8000/api/usuarios/${this.usuarioActual.id_usuario}/perfil`, this.perfilEdit).subscribe({
      next: () => {
        this.usuarioActual.direccion = this.perfilEdit.direccion; this.usuarioActual.telefonoEmergencia = this.perfilEdit.telefonoEmergencia; this.usuarioActual.telefono = this.perfilEdit.telefono;
        localStorage.setItem('usuario_actual', JSON.stringify(this.usuarioActual)); this.toast.success('Datos actualizados'); this.cdr.detectChanges();
      }, error: () => this.toast.error('Error al actualizar datos')
    });
  }
}