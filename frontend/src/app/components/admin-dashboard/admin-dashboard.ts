import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CarreraService } from '../../services/carrera';
import { AcademicoService } from '../../services/academico';
import { ToastService } from '../../services/toast';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.css']
})
export class AdminDashboard implements OnInit {
  vistaActual: string = 'inicio';
  subVistaUsuarios: string = 'estudiantes';
  usuarioActual: any = null;
  sidebarAbierto = false;

  carreras: any[] = []; facultades: any[] = [];
  materias: any[] = []; grupos: any[] = [];
  docentes: any[] = []; estudiantes: any[] = [];
  periodos: any[] = []; roles: any[] = [];
  modalidades: any[] = [];

  modoEdicionEstudiante = false; idEdicionEstudiante = 0;
  modoEdicionDocente = false; idEdicionDocente = 0;
  
  // Modal Ver Detalles
  usuarioViendo: any = null;

  nuevaCarrera = { nombre: '', codigo: '', descripcion: '', id_facultad: null as number | null, id_modalidad: null as number | null, estado: true };
  nuevaMateria = { nombre: '', codigo: '', nivel: 1, id_carrera: null as number | null, estado: true };
  nuevoPrerequisito = { id_materia: null as number | null, id_prerequisito: null as number | null };
  nuevoGrupo = { seccion: '', cupoMax: 40, id_materia: null as number | null, id_periodo: null as number | null, id_docente: null as number | null, estado: true };
  nuevoEstudiante = { nombres: '', apellidos: '', ci: '', correo: '', password: '', id_rol: 3, telefono: '', telefonoEmergencia: '', direccion: '', genero: 'Masculino', fechalngreso: '', estado: true };
  nuevoDocente = { nombres: '', apellidos: '', ci: '', correo: '', password: '', id_rol: 2, especialidad: '', telefonoEmergencia: '', direccion: '', fechalngreso: '', estado: true };

  perfilEdit = { direccion: '', telefonoEmergencia: '' };
  archivoFoto: File | null = null;

  constructor(
    private router: Router, 
    private carreraService: CarreraService, 
    private academicoService: AcademicoService, 
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient
  ) {}

  ngOnInit() {
    const userStr = localStorage.getItem('usuario_actual');
    if (userStr) {
      this.usuarioActual = JSON.parse(userStr);
      this.perfilEdit.direccion = this.usuarioActual.direccion || '';
      this.perfilEdit.telefonoEmergencia = this.usuarioActual.telefonoEmergencia || '';
    }
    this.cargarDatosGlobales();
  }

  toggleSidebar() { this.sidebarAbierto = !this.sidebarAbierto; this.cdr.detectChanges(); }
  cambiarVista(vista: string) { this.vistaActual = vista; this.sidebarAbierto = false; this.cdr.detectChanges(); }
  cambiarSubVistaUsuarios(subVista: string) { this.subVistaUsuarios = subVista; this.cdr.detectChanges(); }
  cerrarSesion() { localStorage.removeItem('usuario_actual'); this.router.navigate(['/login']); }

  cargarDatosGlobales() {
    this.carreraService.getCarreras().subscribe(data => { this.carreras = data; this.cdr.detectChanges(); });
    this.carreraService.getFacultades().subscribe(data => { this.facultades = data; this.cdr.detectChanges(); });
    this.carreraService.getModalidades().subscribe(data => { this.modalidades = data; this.cdr.detectChanges(); });
    this.academicoService.getMaterias().subscribe(data => { this.materias = data; this.cdr.detectChanges(); });
    this.academicoService.getGrupos().subscribe(data => { this.grupos = data; this.cdr.detectChanges(); });
    this.academicoService.getDocentes().subscribe(data => { this.docentes = data; this.cdr.detectChanges(); });
    this.academicoService.getEstudiantes().subscribe(data => { this.estudiantes = data; this.cdr.detectChanges(); });
    this.academicoService.getRoles().subscribe(data => { this.roles = data; this.cdr.detectChanges(); });
    this.academicoService.getPeriodos().subscribe(data => { this.periodos = data; this.cdr.detectChanges(); });
  }

  procesarError(err: any): string {
    if (err.status === 422 && Array.isArray(err.error?.detail)) return err.error.detail.map((e: any) => `Error en [${e.loc[e.loc.length - 1]}]: ${e.msg}`).join(' | ');
    return err.error?.detail || err.message || 'Error del servidor';
  }

  get ultimosEstudiantes() { return [...this.estudiantes].reverse().slice(0, 5); }

  // --- BOTON VER DETALLES ---
  verDetalles(usuario: any) {
    this.usuarioViendo = usuario;
    this.cdr.detectChanges();
  }
  cerrarDetalles() {
    this.usuarioViendo = null;
    this.cdr.detectChanges();
  }

  // --- REPORTES COMPLETOS ---
  exportarPDFEstudiantes() {
    const doc = new jsPDF('landscape'); doc.text('Padrón de Estudiantes Completo - U-Gestión', 14, 15);
    const data = this.estudiantes.map(e => [e.codEstudiante, `${e.nombres} ${e.apellidos}`, e.ci, e.correo, e.telefono || 'N/A', e.telefonoEmergencia || 'N/A', e.direccion || 'N/A']);
    autoTable(doc, { head: [['Matrícula', 'Nombre Completo', 'CI', 'Correo', 'Celular', 'Emergencia', 'Dirección']], body: data, startY: 20, styles: { fontSize: 8 } });
    doc.save('estudiantes_completo.pdf'); this.toast.success('PDF Descargado');
  }

  exportarExcelEstudiantes() {
    const ws = XLSX.utils.json_to_sheet(this.estudiantes.map(e => ({ Matrícula: e.codEstudiante, Nombres: e.nombres, Apellidos: e.apellidos, CI: e.ci, Correo: e.correo, Celular: e.telefono, Emergencia: e.telefonoEmergencia, Dirección: e.direccion })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Estudiantes");
    XLSX.writeFile(wb, "estudiantes_completo.xlsx"); this.toast.success('Excel Descargado');
  }

  exportarPDFDocentes() {
    const doc = new jsPDF('landscape'); doc.text('Planilla de Docentes Completa - U-Gestión', 14, 15);
    const data = this.docentes.map(d => [`${d.nombres} ${d.apellidos}`, d.ci, d.correo, d.especialidad, d.telefonoEmergencia || 'N/A', d.direccion || 'N/A']);
    autoTable(doc, { head: [['Nombre Completo', 'CI', 'Correo', 'Especialidad', 'Emergencia', 'Dirección']], body: data, startY: 20, styles: { fontSize: 8 } });
    doc.save('docentes_completo.pdf'); this.toast.success('PDF Descargado');
  }

  exportarExcelDocentes() {
    const ws = XLSX.utils.json_to_sheet(this.docentes.map(d => ({ Nombres: d.nombres, Apellidos: d.apellidos, CI: d.ci, Correo: d.correo, Especialidad: d.especialidad, Emergencia: d.telefonoEmergencia, Dirección: d.direccion })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Docentes");
    XLSX.writeFile(wb, "docentes_completo.xlsx"); this.toast.success('Excel Descargado');
  }

  // --- PERFIL ADMIN ---
  seleccionarFoto(event: any) { this.archivoFoto = event.target.files[0]; this.cdr.detectChanges(); }
  subirFoto() {
    if (!this.archivoFoto) return;
    const formData = new FormData(); formData.append('file', this.archivoFoto);
    this.http.post(`http://127.0.0.1:8000/api/usuarios/${this.usuarioActual.id_usuario}/foto`, formData).subscribe({
      next: (res: any) => {
        this.usuarioActual.fotoPerfil = res.fotoPerfil; localStorage.setItem('usuario_actual', JSON.stringify(this.usuarioActual));
        this.toast.success('Foto actualizada'); this.archivoFoto = null; this.cdr.detectChanges();
      }, error: () => this.toast.error('Error al subir foto')
    });
  }
  actualizarPerfil() {
    this.http.put(`http://127.0.0.1:8000/api/usuarios/${this.usuarioActual.id_usuario}/perfil`, this.perfilEdit).subscribe({
      next: () => {
        this.usuarioActual.direccion = this.perfilEdit.direccion; this.usuarioActual.telefonoEmergencia = this.perfilEdit.telefonoEmergencia;
        localStorage.setItem('usuario_actual', JSON.stringify(this.usuarioActual)); this.toast.success('Perfil actualizado'); this.cdr.detectChanges();
      }, error: () => this.toast.error('Error al actualizar')
    });
  }

  // --- ESTUDIANTES CRUD ---
  cargarEstudianteParaEdicion(e: any) {
    this.modoEdicionEstudiante = true; this.idEdicionEstudiante = e.id_usuario;
    this.nuevoEstudiante = { ...e, password: '' }; window.scrollTo({ top: 0, behavior: 'smooth' });
    this.toast.info('Modo Edición Activado.'); this.cdr.detectChanges();
  }
  cancelarEdicionEstudiante() {
    this.modoEdicionEstudiante = false; this.idEdicionEstudiante = 0;
    this.nuevoEstudiante = { nombres: '', apellidos: '', ci: '', correo: '', password: '', id_rol: 3, telefono: '', telefonoEmergencia: '', direccion: '', genero: 'Masculino', fechalngreso: '', estado: true };
    this.cdr.detectChanges();
  }
  guardarEstudiante() {
    if (!this.nuevoEstudiante.nombres || !this.nuevoEstudiante.apellidos || !this.nuevoEstudiante.ci || !this.nuevoEstudiante.correo) return this.toast.warning('Complete los datos.');
    const payload: any = { ...this.nuevoEstudiante };
    if (payload.fechalngreso === '') payload.fechalngreso = null;
    if (this.modoEdicionEstudiante) {
      this.academicoService.actualizarEstudiante(this.idEdicionEstudiante, payload).subscribe({
        next: (res) => {
          const index = this.estudiantes.findIndex(e => e.id_usuario === this.idEdicionEstudiante);
          if (index !== -1) this.estudiantes[index] = res;
          this.cancelarEdicionEstudiante(); this.toast.success('Estudiante actualizado.'); this.cdr.detectChanges();
        }, error: (err) => this.toast.error(this.procesarError(err))
      });
    } else {
      if (!this.nuevoEstudiante.password) return this.toast.warning('Ingrese contraseña.');
      this.academicoService.crearEstudiante(payload).subscribe({
        next: (res) => { this.estudiantes = [...this.estudiantes, res]; this.cancelarEdicionEstudiante(); this.toast.success('Estudiante registrado.'); this.cdr.detectChanges(); },
        error: (err) => this.toast.error(this.procesarError(err))
      });
    }
  }

  // --- DOCENTES CRUD ---
  cargarDocenteParaEdicion(d: any) {
    this.modoEdicionDocente = true; this.idEdicionDocente = d.id_usuario;
    this.nuevoDocente = { ...d, password: '' }; window.scrollTo({ top: 0, behavior: 'smooth' });
    this.toast.info('Modo Edición Activado.'); this.cdr.detectChanges();
  }
  cancelarEdicionDocente() {
    this.modoEdicionDocente = false; this.idEdicionDocente = 0;
    this.nuevoDocente = { nombres: '', apellidos: '', ci: '', correo: '', password: '', id_rol: 2, especialidad: '', telefonoEmergencia: '', direccion: '', fechalngreso: '', estado: true };
    this.cdr.detectChanges();
  }
  guardarDocente() {
    if (!this.nuevoDocente.nombres || !this.nuevoDocente.apellidos || !this.nuevoDocente.ci || !this.nuevoDocente.correo || !this.nuevoDocente.especialidad) return this.toast.warning('Faltan datos.');
    const payload: any = { ...this.nuevoDocente };
    if (payload.fechalngreso === '') payload.fechalngreso = null;
    if (this.modoEdicionDocente) {
      this.academicoService.actualizarDocente(this.idEdicionDocente, payload).subscribe({
        next: (res) => {
          const index = this.docentes.findIndex(d => d.id_usuario === this.idEdicionDocente);
          if (index !== -1) this.docentes[index] = res;
          this.cancelarEdicionDocente(); this.toast.success('Docente actualizado.'); this.cdr.detectChanges();
        }, error: (err) => this.toast.error(this.procesarError(err))
      });
    } else {
      if (!this.nuevoDocente.password) return this.toast.warning('Ingrese contraseña.');
      this.academicoService.crearDocente(payload).subscribe({
        next: (res) => { this.docentes = [...this.docentes, res]; this.cancelarEdicionDocente(); this.toast.success('Docente registrado.'); this.cdr.detectChanges(); },
        error: (err) => this.toast.error(this.procesarError(err))
      });
    }
  }

  // --- OTRAS FUNCIONES Y PREREQUISITOS ---
  guardarPrerequisito() {
    if(this.nuevoPrerequisito.id_materia === this.nuevoPrerequisito.id_prerequisito) return this.toast.warning('Una materia no puede ser prerequisito de sí misma.');
    this.academicoService.crearPrerequisito(this.nuevoPrerequisito).subscribe({
      next: () => { this.toast.success('Regla guardada.'); this.nuevoPrerequisito = { id_materia: null, id_prerequisito: null }; this.cdr.detectChanges(); },
      error: (err) => this.toast.error(this.procesarError(err))
    });
  }

  guardarCarrera() { this.carreraService.crearCarrera(this.nuevaCarrera).subscribe({ next: (res) => { this.carreras = [...this.carreras, res]; this.nuevaCarrera = { nombre: '', codigo: '', descripcion: '', id_facultad: null, id_modalidad: null, estado: true }; this.toast.success('Carrera registrada.'); this.cdr.detectChanges(); }, error: (err) => this.toast.error(this.procesarError(err)) }); }
  guardarMateria() { this.academicoService.crearMateria(this.nuevaMateria).subscribe({ next: (res) => { this.materias = [...this.materias, res]; this.nuevaMateria = { nombre: '', codigo: '', nivel: 1, id_carrera: null, estado: true }; this.toast.success('Materia registrada.'); this.cdr.detectChanges(); }, error: (err) => this.toast.error(this.procesarError(err)) }); }
  guardarGrupo() { this.academicoService.crearGrupo(this.nuevoGrupo).subscribe({ next: (res) => { this.grupos = [...this.grupos, res]; this.nuevoGrupo = { seccion: '', cupoMax: 40, id_materia: null, id_periodo: null, id_docente: null, estado: true }; this.toast.success('Grupo aperturado.'); this.cdr.detectChanges(); }, error: (err) => this.toast.error(this.procesarError(err)) }); }

  eliminarEstudiante(id: number) { if (!confirm('¿Seguro?')) return; this.academicoService.eliminarEstudiante(id).subscribe({ next: () => { this.estudiantes = this.estudiantes.filter(e => e.id_usuario !== id); this.toast.success('Eliminado.'); this.cdr.detectChanges(); }, error: (err) => this.toast.error(this.procesarError(err)) }); }
  eliminarDocente(id: number) { if (!confirm('¿Seguro?')) return; this.academicoService.eliminarDocente(id).subscribe({ next: () => { this.docentes = this.docentes.filter(d => d.id_usuario !== id); this.toast.success('Eliminado.'); this.cdr.detectChanges(); }, error: (err) => this.toast.error(this.procesarError(err)) }); }
  eliminarCarrera(id: number) { if (!confirm('¿Seguro?')) return; this.carreraService.eliminarCarrera(id).subscribe({ next: () => { this.carreras = this.carreras.filter(c => c.id_carrera !== id); this.toast.success('Eliminada.'); this.cdr.detectChanges(); }, error: (err) => this.toast.error(this.procesarError(err)) }); }
  eliminarMateria(id: number) { if (!confirm('¿Seguro?')) return; this.academicoService.eliminarMateria(id).subscribe({ next: () => { this.materias = this.materias.filter(m => m.id_materia !== id); this.toast.success('Eliminada.'); this.cdr.detectChanges(); }, error: (err) => this.toast.error(this.procesarError(err)) }); }
  eliminarGrupo(id: number) { if (!confirm('¿Seguro?')) return; this.academicoService.eliminarGrupo(id).subscribe({ next: () => { this.grupos = this.grupos.filter(g => g.id_grupo !== id); this.toast.success('Eliminado.'); this.cdr.detectChanges(); }, error: (err) => this.toast.error(this.procesarError(err)) }); }

  getNombreDocente(idDocente: number): string { const doc = this.docentes.find(d => d.id_usuario === idDocente); return doc ? `${doc.nombres} ${doc.apellidos}` : `ID: ${idDocente}`; }
}