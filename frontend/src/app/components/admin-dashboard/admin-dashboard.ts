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
  vistaActual: string = 'inicio'; subVistaUsuarios: string = 'estudiantes'; usuarioActual: any = null; sidebarAbierto = false;
  carreras: any[] = []; facultades: any[] = []; materias: any[] = []; grupos: any[] = [];
  docentes: any[] = []; estudiantes: any[] = []; periodos: any[] = []; roles: any[] = [];
  modalidades: any[] = []; inscripciones: any[] = []; aulas: any[] = [];

  terminoEstudiantes: string = ''; terminoDocentes: string = ''; terminoCarreras: string = ''; terminoMaterias: string = ''; terminoGrupos: string = '';
  modoEdicionEstudiante = false; idEdicionEstudiante = 0; modoEdicionDocente = false; idEdicionDocente = 0;
  modoEdicionCarrera = false; idEdicionCarrera = 0; modoEdicionMateria = false; idEdicionMateria = 0;
  modoEdicionGrupo = false; idEdicionGrupo = 0; modoEdicionAula = false; idEdicionAula = 0;
  itemViendo: any = null; tipoItemViendo: string = '';

  nuevaCarrera = { nombre: '', codigo: '', descripcion: '', id_facultad: null as number | null, id_modalidad: null as number | null, estado: true };
  nuevaMateria = { nombre: '', codigo: '', nivel: 1, id_carrera: null as number | null, estado: true };
  nuevoPrerequisito = { id_materia: null as number | null, id_prerequisito: null as number | null };
  
  // TODO EL PODER EN EL GRUPO
  nuevoGrupo = { seccion: '', cupoMax: 40, id_materia: null as number | null, id_periodo: null as number | null, id_docente: null as number | null, turno: 'Mañana', id_aula: null as number | null, horaInicio: '08:00', horaFin: '10:00', estado: true };

  nuevoEstudiante = { nombres: '', apellidos: '', ci: '', correo: '', password: '', id_rol: 3, telefono: '', telefonoEmergencia: '', direccion: '', genero: 'Masculino', fechalngreso: '', estado: true };
  nuevoDocente = { nombres: '', apellidos: '', ci: '', correo: '', password: '', id_rol: 2, especialidad: '', telefonoEmergencia: '', direccion: '', fechalngreso: '', estado: true };
  nuevaAula = { nombre: '', edificio: '', capacidad: 40, tipo: 'Teoría' };
  perfilEdit = { direccion: '', telefonoEmergencia: '' }; archivoFoto: File | null = null;

  constructor(private router: Router, private carreraService: CarreraService, private academicoService: AcademicoService, private toast: ToastService, private cdr: ChangeDetectorRef, private http: HttpClient) {}

  ngOnInit() { const userStr = localStorage.getItem('usuario_actual'); if (userStr) { this.usuarioActual = JSON.parse(userStr); this.perfilEdit.direccion = this.usuarioActual.direccion || ''; this.perfilEdit.telefonoEmergencia = this.usuarioActual.telefonoEmergencia || ''; } this.cargarDatosGlobales(); }
  toggleSidebar() { this.sidebarAbierto = !this.sidebarAbierto; this.cdr.detectChanges(); }
  cambiarVista(vista: string) { this.vistaActual = vista; this.sidebarAbierto = false; this.cdr.detectChanges(); }
  cambiarSubVistaUsuarios(subVista: string) { this.subVistaUsuarios = subVista; this.cdr.detectChanges(); }
  cerrarSesion() { localStorage.removeItem('usuario_actual'); this.router.navigate(['/login']); }

  soloNumeros(texto: string): boolean { return /^\d+$/.test(texto); }
  emailValido(email: string): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
  soloLetras(texto: string): boolean { return /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]+$/.test(texto); }
  telefonoValido(tel: string): boolean { return /^[\d\s\+\-\(\)]+$/.test(tel); }

  cargarDatosGlobales() {
    this.carreraService.getCarreras().subscribe((data: any) => { this.carreras = data; this.cdr.detectChanges(); });
    this.carreraService.getFacultades().subscribe((data: any) => { this.facultades = data; this.cdr.detectChanges(); });
    this.carreraService.getModalidades().subscribe((data: any) => { this.modalidades = data; this.cdr.detectChanges(); });
    this.academicoService.getMaterias().subscribe((data: any) => { this.materias = data; this.cdr.detectChanges(); });
    this.academicoService.getGrupos().subscribe((data: any) => { this.grupos = data; this.cdr.detectChanges(); });
    this.academicoService.getDocentes().subscribe((data: any) => { this.docentes = data; this.cdr.detectChanges(); });
    this.academicoService.getEstudiantes().subscribe((data: any) => { this.estudiantes = data; this.cdr.detectChanges(); });
    this.academicoService.getRoles().subscribe((data: any) => { this.roles = data; this.cdr.detectChanges(); });
    this.academicoService.getPeriodos().subscribe((data: any) => { this.periodos = data; this.cdr.detectChanges(); });
    this.academicoService.getAulas().subscribe((data: any) => { this.aulas = data; this.cdr.detectChanges(); });
    this.http.get<any[]>('http://127.0.0.1:8000/api/inscripciones').subscribe((data: any) => { this.inscripciones = data; this.cdr.detectChanges(); });
  }

  procesarError(err: any): string { if (err.status === 422 && Array.isArray(err.error?.detail)) return err.error.detail.map((e: any) => `Error en [${e.loc[e.loc.length - 1]}]: ${e.msg}`).join(' | '); return err.error?.detail || err.message || 'Error del servidor'; }

  get estudiantesFiltrados() { if (!this.terminoEstudiantes) return this.estudiantes; const term = this.terminoEstudiantes.toLowerCase(); return this.estudiantes.filter(e => e.ci.includes(term) || e.codEstudiante?.toLowerCase().includes(term)); }
  get docentesFiltrados() { if (!this.terminoDocentes) return this.docentes; const term = this.terminoDocentes.toLowerCase(); return this.docentes.filter(d => d.ci.includes(term) || d.nombres.toLowerCase().includes(term) || d.apellidos.toLowerCase().includes(term)); }
  get carrerasFiltradas() { if (!this.terminoCarreras) return this.carreras; const term = this.terminoCarreras.toLowerCase(); return this.carreras.filter(c => c.nombre.toLowerCase().includes(term) || c.codigo.toLowerCase().includes(term)); }
  get materiasFiltradas() { if (!this.terminoMaterias) return this.materias; const term = this.terminoMaterias.toLowerCase(); return this.materias.filter(m => m.nombre.toLowerCase().includes(term) || m.codigo.toLowerCase().includes(term)); }
  get gruposFiltrados() { if (!this.terminoGrupos) return this.grupos; const term = this.terminoGrupos.toLowerCase(); return this.grupos.filter(g => g.seccion.toLowerCase().includes(term) || this.getNombreMateria(g.id_materia).toLowerCase().includes(term)); }

  get ultimosEstudiantes() { return [...this.estudiantes].reverse().slice(0, 5); } get ultimosDocentes() { return [...this.docentes].reverse().slice(0, 4); } get ultimosGrupos() { return [...this.grupos].reverse().slice(0, 4); }
  get cuposTotales() { return this.grupos.reduce((acc, g) => acc + g.cupoMax, 0); } get cuposUsados() { return this.grupos.reduce((acc, g) => acc + (g.cupoMax - g.cupoDisp), 0); } get porcentajeCupos() { return this.cuposTotales === 0 ? 0 : Math.round((this.cuposUsados / this.cuposTotales) * 100); }

  verDetalles(item: any, tipo: string) { this.itemViendo = item; this.tipoItemViendo = tipo; this.cdr.detectChanges(); }
  cerrarDetalles() { this.itemViendo = null; this.tipoItemViendo = ''; this.cdr.detectChanges(); }

  exportarPDFEstudiantes() { const doc = new jsPDF('landscape'); doc.text('Padrón de Estudiantes Completo', 14, 15); const data = this.estudiantes.map(e => [e.codEstudiante, `${e.nombres} ${e.apellidos}`, e.ci, e.correo, e.telefono || 'N/A', e.telefonoEmergencia || 'N/A', e.direccion || 'N/A']); autoTable(doc, { head: [['Matrícula', 'Nombre Completo', 'CI', 'Correo', 'Celular', 'Emergencia', 'Dirección']], body: data, startY: 20, styles: { fontSize: 8 } }); doc.save('estudiantes.pdf'); this.toast.success('PDF Descargado'); }
  exportarExcelEstudiantes() { const ws = XLSX.utils.json_to_sheet(this.estudiantes.map(e => ({ Matrícula: e.codEstudiante, Nombres: e.nombres, Apellidos: e.apellidos, CI: e.ci, Correo: e.correo, Celular: e.telefono, Emergencia: e.telefonoEmergencia, Dirección: e.direccion }))); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Estudiantes"); XLSX.writeFile(wb, "estudiantes.xlsx"); this.toast.success('Excel Descargado'); }
  exportarPDFDocentes() { const doc = new jsPDF('landscape'); doc.text('Planilla de Docentes Completa', 14, 15); const data = this.docentes.map(d => [`${d.nombres} ${d.apellidos}`, d.ci, d.correo, d.especialidad, d.telefonoEmergencia || 'N/A', d.direccion || 'N/A']); autoTable(doc, { head: [['Nombre Completo', 'CI', 'Correo', 'Especialidad', 'Emergencia', 'Dirección']], body: data, startY: 20, styles: { fontSize: 8 } }); doc.save('docentes.pdf'); this.toast.success('PDF Descargado'); }
  exportarExcelDocentes() { const ws = XLSX.utils.json_to_sheet(this.docentes.map(d => ({ Nombres: d.nombres, Apellidos: d.apellidos, CI: d.ci, Correo: d.correo, Especialidad: d.especialidad, Emergencia: d.telefonoEmergencia, Dirección: d.direccion }))); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Docentes"); XLSX.writeFile(wb, "docentes.xlsx"); this.toast.success('Excel Descargado'); }

  seleccionarFoto(event: any) { this.archivoFoto = event.target.files[0]; this.cdr.detectChanges(); }
  subirFoto() { if (!this.archivoFoto) return; const formData = new FormData(); formData.append('file', this.archivoFoto); this.http.post(`http://127.0.0.1:8000/api/usuarios/${this.usuarioActual.id_usuario}/foto`, formData).subscribe({ next: (res: any) => { this.usuarioActual.fotoPerfil = res.fotoPerfil; localStorage.setItem('usuario_actual', JSON.stringify(this.usuarioActual)); this.toast.success('Foto actualizada'); this.archivoFoto = null; this.cdr.detectChanges(); }, error: (err: any) => this.toast.error('Error al subir foto') }); }
  actualizarPerfil() {
    if (this.perfilEdit.telefonoEmergencia && !this.telefonoValido(this.perfilEdit.telefonoEmergencia)) return this.toast.warning('Tel. emergencia: solo números permitidos.');
    this.http.put(`http://127.0.0.1:8000/api/usuarios/${this.usuarioActual.id_usuario}/perfil`, this.perfilEdit).subscribe({ next: (res: any) => { this.usuarioActual.direccion = this.perfilEdit.direccion; this.usuarioActual.telefonoEmergencia = this.perfilEdit.telefonoEmergencia; localStorage.setItem('usuario_actual', JSON.stringify(this.usuarioActual)); this.toast.success('Perfil actualizado'); this.cdr.detectChanges(); }, error: (err: any) => this.toast.error('Error al actualizar') }); }

  cargarEstudianteParaEdicion(e: any) { this.modoEdicionEstudiante = true; this.idEdicionEstudiante = e.id_usuario; this.nuevoEstudiante = { ...e, password: '' }; window.scrollTo({ top: 0, behavior: 'smooth' }); this.cdr.detectChanges(); }
  cancelarEdicionEstudiante() { this.modoEdicionEstudiante = false; this.idEdicionEstudiante = 0; this.nuevoEstudiante = { nombres: '', apellidos: '', ci: '', correo: '', password: '', id_rol: 3, telefono: '', telefonoEmergencia: '', direccion: '', genero: 'Masculino', fechalngreso: '', estado: true }; this.cdr.detectChanges(); }
  guardarEstudiante() {
    const e = this.nuevoEstudiante;
    if (!this.soloLetras(e.nombres)) return this.toast.warning('Nombres: solo letras permitidas.');
    if (!this.soloLetras(e.apellidos)) return this.toast.warning('Apellidos: solo letras permitidas.');
    if (!this.soloNumeros(e.ci)) return this.toast.warning('CI: solo números permitidos.');
    if (!this.emailValido(e.correo)) return this.toast.warning('Formato de correo inválido.');
    if (!this.modoEdicionEstudiante && e.password.length < 4) return this.toast.warning('Contraseña: mínimo 4 caracteres.');
    if (e.telefono && !this.telefonoValido(e.telefono)) return this.toast.warning('Teléfono: solo números permitidos.');
    if (e.telefonoEmergencia && !this.telefonoValido(e.telefonoEmergencia)) return this.toast.warning('Tel. emergencia: solo números permitidos.');
    const payload: any = { ...e }; if (payload.fechalngreso === '') payload.fechalngreso = null; payload.id_rol = 3; if (this.modoEdicionEstudiante) { this.academicoService.actualizarEstudiante(this.idEdicionEstudiante, payload).subscribe({ next: (res: any) => { const idx = this.estudiantes.findIndex(e => e.id_usuario === this.idEdicionEstudiante); if (idx !== -1) this.estudiantes[idx] = res; this.cancelarEdicionEstudiante(); this.toast.success('Estudiante actualizado.'); this.cdr.detectChanges(); }, error: (err: any) => this.toast.error(this.procesarError(err)) }); } else { this.academicoService.crearEstudiante(payload).subscribe({ next: (res: any) => { this.estudiantes = [...this.estudiantes, res]; this.cancelarEdicionEstudiante(); this.toast.success('Estudiante registrado.'); this.cdr.detectChanges(); }, error: (err: any) => this.toast.error(this.procesarError(err)) }); } }

  cargarDocenteParaEdicion(d: any) { this.modoEdicionDocente = true; this.idEdicionDocente = d.id_usuario; this.nuevoDocente = { ...d, password: '' }; window.scrollTo({ top: 0, behavior: 'smooth' }); this.cdr.detectChanges(); }
  cancelarEdicionDocente() { this.modoEdicionDocente = false; this.idEdicionDocente = 0; this.nuevoDocente = { nombres: '', apellidos: '', ci: '', correo: '', password: '', id_rol: 2, especialidad: '', telefonoEmergencia: '', direccion: '', fechalngreso: '', estado: true }; this.cdr.detectChanges(); }
  guardarDocente() {
    const d = this.nuevoDocente;
    if (!this.soloLetras(d.nombres)) return this.toast.warning('Nombres: solo letras permitidas.');
    if (!this.soloLetras(d.apellidos)) return this.toast.warning('Apellidos: solo letras permitidas.');
    if (!this.soloNumeros(d.ci)) return this.toast.warning('CI: solo números permitidos.');
    if (!this.emailValido(d.correo)) return this.toast.warning('Formato de correo inválido.');
    if (!this.modoEdicionDocente && d.password.length < 4) return this.toast.warning('Contraseña: mínimo 4 caracteres.');
    if (!this.soloLetras(d.especialidad)) return this.toast.warning('Especialidad: solo letras permitidas.');
    if (d.telefonoEmergencia && !this.telefonoValido(d.telefonoEmergencia)) return this.toast.warning('Tel. emergencia: solo números permitidos.');
    const payload: any = { ...d }; if (payload.fechalngreso === '') payload.fechalngreso = null; payload.id_rol = 2; if (this.modoEdicionDocente) { this.academicoService.actualizarDocente(this.idEdicionDocente, payload).subscribe({ next: (res: any) => { const idx = this.docentes.findIndex(d => d.id_usuario === this.idEdicionDocente); if (idx !== -1) this.docentes[idx] = res; this.cancelarEdicionDocente(); this.toast.success('Docente actualizado.'); this.cdr.detectChanges(); }, error: (err: any) => this.toast.error(this.procesarError(err)) }); } else { this.academicoService.crearDocente(payload).subscribe({ next: (res: any) => { this.docentes = [...this.docentes, res]; this.cancelarEdicionDocente(); this.toast.success('Docente registrado.'); this.cdr.detectChanges(); }, error: (err: any) => this.toast.error(this.procesarError(err)) }); } }

  cargarCarreraParaEdicion(c: any) { this.modoEdicionCarrera = true; this.idEdicionCarrera = c.id_carrera; this.nuevaCarrera = { ...c }; window.scrollTo({ top: 0, behavior: 'smooth' }); this.cdr.detectChanges(); }
  cancelarEdicionCarrera() { this.modoEdicionCarrera = false; this.idEdicionCarrera = 0; this.nuevaCarrera = { nombre: '', codigo: '', descripcion: '', id_facultad: null, id_modalidad: null, estado: true }; this.cdr.detectChanges(); }
  guardarCarrera() {
    if (!this.nuevaCarrera.nombre.trim()) return this.toast.warning('El nombre de la carrera es obligatorio.');
    if (!this.nuevaCarrera.codigo.trim()) return this.toast.warning('El código de la carrera es obligatorio.');
    if (!this.nuevaCarrera.id_facultad) return this.toast.warning('Selecciona una facultad.');
    if (!this.nuevaCarrera.id_modalidad) return this.toast.warning('Selecciona una modalidad.');
    if(this.modoEdicionCarrera) { this.carreraService.actualizarCarrera(this.idEdicionCarrera, this.nuevaCarrera).subscribe({ next: (res: any) => { const idx = this.carreras.findIndex(c => c.id_carrera === this.idEdicionCarrera); if(idx !== -1) this.carreras[idx] = res; this.cancelarEdicionCarrera(); this.toast.success('Actualizada'); this.cdr.detectChanges(); }, error: (err: any) => this.toast.error(this.procesarError(err)) }); } else { this.carreraService.crearCarrera(this.nuevaCarrera).subscribe({ next: (res: any) => { this.carreras = [...this.carreras, res]; this.cancelarEdicionCarrera(); this.toast.success('Registrada'); this.cdr.detectChanges(); }, error: (err: any) => this.toast.error(this.procesarError(err)) }); } }

  cargarMateriaParaEdicion(m: any) { this.modoEdicionMateria = true; this.idEdicionMateria = m.id_materia; this.nuevaMateria = { ...m }; window.scrollTo({ top: 0, behavior: 'smooth' }); this.cdr.detectChanges(); }
  cancelarEdicionMateria() { this.modoEdicionMateria = false; this.idEdicionMateria = 0; this.nuevaMateria = { nombre: '', codigo: '', nivel: 1, id_carrera: null, estado: true }; this.cdr.detectChanges(); }
  guardarMateria() {
    if (!this.nuevaMateria.nombre.trim()) return this.toast.warning('El nombre de la materia es obligatorio.');
    if (!this.nuevaMateria.codigo.trim()) return this.toast.warning('El código de la materia es obligatorio.');
    if (!this.nuevaMateria.id_carrera) return this.toast.warning('Selecciona una carrera.');
    if(this.modoEdicionMateria) { this.academicoService.actualizarMateria(this.idEdicionMateria, this.nuevaMateria).subscribe({ next: (res: any) => { const idx = this.materias.findIndex(m => m.id_materia === this.idEdicionMateria); if(idx !== -1) this.materias[idx] = res; this.cancelarEdicionMateria(); this.toast.success('Actualizada'); this.cdr.detectChanges(); }, error: (err: any) => this.toast.error(this.procesarError(err)) }); } else { this.academicoService.crearMateria(this.nuevaMateria).subscribe({ next: (res: any) => { this.materias = [...this.materias, res]; this.cancelarEdicionMateria(); this.toast.success('Registrada'); this.cdr.detectChanges(); }, error: (err: any) => this.toast.error(this.procesarError(err)) }); } }

  guardarPrerequisito() {
    if (!this.nuevoPrerequisito.id_materia) return this.toast.warning('Selecciona la materia destino.');
    if (!this.nuevoPrerequisito.id_prerequisito) return this.toast.warning('Selecciona el prerrequisito.');
    if(this.nuevoPrerequisito.id_materia === this.nuevoPrerequisito.id_prerequisito) return this.toast.warning('No puede ser prerequisito de sí misma.');
    this.academicoService.crearPrerequisito(this.nuevoPrerequisito).subscribe({ next: (res: any) => { this.toast.success('Regla guardada.'); this.nuevoPrerequisito = { id_materia: null, id_prerequisito: null }; this.cdr.detectChanges(); }, error: (err: any) => this.toast.error(this.procesarError(err)) }); }

  cargarAulaParaEdicion(a: any) { this.modoEdicionAula = true; this.idEdicionAula = a.id_aula; this.nuevaAula = { ...a }; window.scrollTo({ top: 0, behavior: 'smooth' }); this.cdr.detectChanges(); }
  cancelarEdicionAula() { this.modoEdicionAula = false; this.idEdicionAula = 0; this.nuevaAula = { nombre: '', edificio: '', capacidad: 40, tipo: 'Teoría' }; this.cdr.detectChanges(); }
  guardarAula() {
    if (!this.nuevaAula.nombre.trim()) return this.toast.warning('El nombre del aula es obligatorio.');
    if (!this.nuevaAula.edificio.trim()) return this.toast.warning('El edificio es obligatorio.');
    if (this.nuevaAula.capacidad < 1) return this.toast.warning('La capacidad debe ser al menos 1.');
    if(this.modoEdicionAula) { this.academicoService.actualizarAula(this.idEdicionAula, this.nuevaAula).subscribe({ next: (res: any) => { const idx = this.aulas.findIndex(a => a.id_aula === this.idEdicionAula); if(idx !== -1) this.aulas[idx] = res; this.cancelarEdicionAula(); this.toast.success('Aula actualizada.'); this.cdr.detectChanges(); }, error: (err: any) => this.toast.error(this.procesarError(err)) }); } else { this.academicoService.crearAula(this.nuevaAula).subscribe({ next: (res: any) => { this.aulas = [...this.aulas, res]; this.cancelarEdicionAula(); this.toast.success('Aula registrada.'); this.cdr.detectChanges(); }, error: (err: any) => this.toast.error(this.procesarError(err)) }); } }

  // --- CRUD GRUPO CON TODO ---
  cargarGrupoParaEdicion(g: any) { 
    this.modoEdicionGrupo = true; this.idEdicionGrupo = g.id_grupo; 
    this.nuevoGrupo = { ...g }; 
    // Aseguramos que el tiempo tenga el formato correcto para los inputs de HTML (HH:MM)
    if(this.nuevoGrupo.horaInicio && this.nuevoGrupo.horaInicio.length > 5) this.nuevoGrupo.horaInicio = this.nuevoGrupo.horaInicio.substring(0,5);
    if(this.nuevoGrupo.horaFin && this.nuevoGrupo.horaFin.length > 5) this.nuevoGrupo.horaFin = this.nuevoGrupo.horaFin.substring(0,5);
    window.scrollTo({ top: 0, behavior: 'smooth' }); this.cdr.detectChanges(); 
  }
  cancelarEdicionGrupo() { this.modoEdicionGrupo = false; this.idEdicionGrupo = 0; this.nuevoGrupo = { seccion: '', cupoMax: 40, id_materia: null, id_periodo: null, id_docente: null, turno: 'Mañana', id_aula: null, horaInicio: '08:00', horaFin: '10:00', estado: true }; this.cdr.detectChanges(); }
  
  guardarGrupo() { 
    if (!this.nuevoGrupo.id_materia) return this.toast.warning('Selecciona una materia.');
    if (!this.nuevoGrupo.id_docente) return this.toast.warning('Selecciona un docente.');
    if (!this.nuevoGrupo.id_periodo) return this.toast.warning('Selecciona un periodo.');
    if (!this.nuevoGrupo.seccion.trim()) return this.toast.warning('La sección es obligatoria.');
    if (this.nuevoGrupo.cupoMax < 1) return this.toast.warning('El cupo máximo debe ser al menos 1.');
    if (!this.nuevoGrupo.horaInicio || !this.nuevoGrupo.horaFin) return this.toast.warning('Las horas de inicio y fin son obligatorias.');
    const payload: any = { ...this.nuevoGrupo };
    if (payload.horaInicio.length === 5) payload.horaInicio += ':00';
    if (payload.horaFin.length === 5) payload.horaFin += ':00';

    if(this.modoEdicionGrupo) { 
        this.academicoService.actualizarGrupo(this.idEdicionGrupo, payload).subscribe({ next: (res: any) => { const idx = this.grupos.findIndex(g => g.id_grupo === this.idEdicionGrupo); if(idx !== -1) this.grupos[idx] = res; this.cancelarEdicionGrupo(); this.toast.success('Grupo actualizado'); this.cdr.detectChanges(); }, error: (err: any) => this.toast.error(this.procesarError(err)) }); 
    } else { 
        this.academicoService.crearGrupo(payload).subscribe({ next: (res: any) => { this.grupos = [...this.grupos, res]; this.cancelarEdicionGrupo(); this.toast.success('Grupo aperturado'); this.cdr.detectChanges(); }, error: (err: any) => this.toast.error(this.procesarError(err)) }); 
    } 
  }

  eliminarEstudiante(id: number) { if (!confirm('¿Seguro?')) return; this.academicoService.eliminarEstudiante(id).subscribe({ next: () => { this.estudiantes = this.estudiantes.filter(e => e.id_usuario !== id); this.toast.success('Eliminado.'); this.cdr.detectChanges(); }, error: (err: any) => this.toast.error(this.procesarError(err)) }); }
  eliminarDocente(id: number) { if (!confirm('¿Seguro?')) return; this.academicoService.eliminarDocente(id).subscribe({ next: () => { this.docentes = this.docentes.filter(d => d.id_usuario !== id); this.toast.success('Eliminado.'); this.cdr.detectChanges(); }, error: (err: any) => this.toast.error(this.procesarError(err)) }); }
  eliminarCarrera(id: number) { if (!confirm('¿Seguro?')) return; this.carreraService.eliminarCarrera(id).subscribe({ next: () => { this.carreras = this.carreras.filter(c => c.id_carrera !== id); this.toast.success('Eliminada.'); this.cdr.detectChanges(); }, error: (err: any) => this.toast.error(this.procesarError(err)) }); }
  eliminarMateria(id: number) { if (!confirm('¿Seguro?')) return; this.academicoService.eliminarMateria(id).subscribe({ next: () => { this.materias = this.materias.filter(m => m.id_materia !== id); this.toast.success('Eliminada.'); this.cdr.detectChanges(); }, error: (err: any) => this.toast.error(this.procesarError(err)) }); }
  eliminarGrupo(id: number) { if (!confirm('¿Seguro?')) return; this.academicoService.eliminarGrupo(id).subscribe({ next: () => { this.grupos = this.grupos.filter(g => g.id_grupo !== id); this.toast.success('Eliminado.'); this.cdr.detectChanges(); }, error: (err: any) => this.toast.error(this.procesarError(err)) }); }
  eliminarAula(id: number) { if (!confirm('¿Seguro?')) return; this.academicoService.eliminarAula(id).subscribe({ next: () => { this.aulas = this.aulas.filter(a => a.id_aula !== id); this.toast.success('Aula eliminada.'); this.cdr.detectChanges(); }, error: (err: any) => this.toast.error(this.procesarError(err)) }); }

  getNombreDocente(idDocente: number): string { const doc = this.docentes.find(d => d.id_usuario === idDocente); return doc ? `${doc.nombres} ${doc.apellidos}` : `ID: ${idDocente}`; }
  getNombreMateria(idMateria: number): string { const mat = this.materias.find(m => m.id_materia === idMateria); return mat ? mat.nombre : `ID: ${idMateria}`; }
  getNombreAula(idAula: number): string { const au = this.aulas.find(a => a.id_aula === idAula); return au ? `${au.nombre} (${au.edificio})` : `Sin Aula`; }
}