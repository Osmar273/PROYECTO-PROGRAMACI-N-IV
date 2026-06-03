import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DocenteService } from '../../services/docente';
import { ToastService } from '../../services/toast';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  sidebarAbierto: boolean = false;

  materias: any[] = []; misGrupos: any[] = [];
  estudiantes: any[] = []; inscripciones: any[] = [];
  aulas: any[] = []; 
  grupoSeleccionado: any = null; listaAlumnosGrupo: any[] = [];
  evaluacionesGrupo: any[] = [];
  nuevaEval: any = { id_grupo: 0, nombre: '', fecha: '', peso: 0 };
  perfilEdit: any = { direccion: '', telefonoEmergencia: '', telefono: '' };
  archivoFoto: File | null = null;

  constructor(
    private router: Router, 
    private docenteService: DocenteService, 
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
      this.cargarDatosDocente();
    } else {
      this.router.navigate(['/login']);
    }
  }

  toggleSidebar(): void { this.sidebarAbierto = !this.sidebarAbierto; this.cdr.detectChanges(); }
  cambiarVista(vista: string): void { this.vistaActual = vista; this.sidebarAbierto = false; this.cdr.detectChanges(); }
  cerrarSesion(): void { localStorage.removeItem('usuario_actual'); this.router.navigate(['/login']); }

  cargarDatosDocente(): void {
    this.http.get<any[]>('http://127.0.0.1:8000/api/aulas').subscribe((a: any[]) => { this.aulas = a; });
    this.docenteService.getMaterias().subscribe((mat: any[]) => {
      this.materias = mat;
      this.docenteService.getGrupos().subscribe((grupos: any[]) => {
        this.misGrupos = grupos
          .filter((g: any) => Number(g.id_docente) === Number(this.usuarioActual.id_usuario))
          .map((g: any) => {
            const materiaEncontrada = this.materias.find(m => Number(m.id_materia) === Number(g.id_materia));
            return {
              ...g,
              nombreMateria: materiaEncontrada ? materiaEncontrada.nombre : 'Sin nombre',
              codigoMateria: materiaEncontrada ? materiaEncontrada.codigo : 'N/A'
            };
          });
        this.cdr.detectChanges();
      });
    });
    this.docenteService.getEstudiantes().subscribe((est: any[]) => { this.estudiantes = est; });
    this.docenteService.getInscripciones().subscribe((ins: any[]) => { this.inscripciones = ins; });
  }

  getNombreAula(idAula: number): string { const au = this.aulas.find((a: any) => Number(a.id_aula) === Number(idAula)); return au ? au.nombre : 'Sin Aula'; }
  get pesoTotal(): number { return this.evaluacionesGrupo.reduce((acc: number, ev: any) => acc + ev.peso, 0); }

  abrirCalificador(grupo: any): void {
    this.grupoSeleccionado = grupo;
    this.nuevaEval.id_grupo = grupo.id_grupo;
    this.docenteService.getEvaluacionesGrupo(grupo.id_grupo).subscribe((evals: any[]) => {
      this.evaluacionesGrupo = evals;
      
      this.docenteService.getInscripciones().subscribe((todasIns: any[]) => {
        this.inscripciones = todasIns;
        
        this.docenteService.getNotas().subscribe((todasNotas: any[]) => {
          const inscripcionesDelGrupo = this.inscripciones.filter((ins: any) => Number(ins.id_grupo) === Number(grupo.id_grupo));
          
          this.listaAlumnosGrupo = inscripcionesDelGrupo.map((ins: any) => {
            const estudiante = this.estudiantes.find((e: any) => Number(e.id_usuario) === Number(ins.id_estudiante));
            let notasEst: any = {}; let notaFin = 0;
            this.evaluacionesGrupo.forEach((ev: any) => {
              const notaDb = todasNotas.find((n: any) => Number(n.id_inscripcion) === Number(ins.id_inscripcion) && Number(n.id_evaluacion) === Number(ev.id_evaluacion));
              notasEst[ev.id_evaluacion] = notaDb ? notaDb.nota : 0;
              notaFin += (notasEst[ev.id_evaluacion] * (ev.peso / 100));
            });
            return { 
              ...ins, 
              codEstudiante: estudiante?.codEstudiante || 'N/A', 
              nombresEstudiante: estudiante ? `${estudiante?.nombres} ${estudiante?.apellidos}` : 'Desconocido', 
              notas: notasEst, 
              notaFinal: Math.round(notaFin) 
            };
          });
          this.cambiarVista('calificador');
          this.cdr.detectChanges();
        });
      });
    });
  }

  agregarEvaluacion(): void {
    if (!this.nuevaEval.nombre || this.nuevaEval.peso <= 0) return this.toast.warning('Datos inválidos');
    this.nuevaEval.fecha = new Date().toISOString().split('T')[0];
    this.docenteService.crearEvaluacion(this.nuevaEval).subscribe((res) => {
      this.evaluacionesGrupo.push(res);
      this.nuevaEval.nombre = ''; this.nuevaEval.peso = 0;
      this.cdr.detectChanges();
    });
  }

  eliminarEvaluacion(id: number): void {
    this.docenteService.eliminarEvaluacion(id).subscribe(() => {
      this.evaluacionesGrupo = this.evaluacionesGrupo.filter(e => e.id_evaluacion !== id);
      this.cdr.detectChanges();
    });
  }

  guardarNotaCelda(alumno: any, id_ev: number): void {
    this.docenteService.guardarNotaEval({ id_inscripcion: alumno.id_inscripcion, id_evaluacion: id_ev, nota: alumno.notas[id_ev] }).subscribe(() => {
       this.recalcularNotaFinal(alumno);
       this.toast.success('Nota guardada y calculada correctamente');
       this.cdr.detectChanges();
    });
  }

  recalcularNotaFinal(alumno: any): void {
    let suma = 0;
    this.evaluacionesGrupo.forEach((ev: any) => { suma += (alumno.notas[ev.id_evaluacion] || 0) * (ev.peso / 100); });
    alumno.notaFinal = Math.round(suma);
    alumno.estado = alumno.notaFinal >= 51 ? 'Aprobado' : 'Reprobado';
    this.docenteService.actualizarEstadoInscripcion(alumno.id_inscripcion, { estado: alumno.estado }).subscribe();
  }

  descargarActaPDF() {
    if (!this.grupoSeleccionado || this.listaAlumnosGrupo.length === 0) {
      return this.toast.warning('No hay alumnos para generar el acta.');
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('ACTA DE CALIFICACIONES FINALES', 14, 20);
    
    doc.setFontSize(11);
    doc.text(`Asignatura: ${this.grupoSeleccionado.nombreMateria} (Grupo ${this.grupoSeleccionado.seccion})`, 14, 30);
    doc.text(`Docente: ${this.usuarioActual.nombres} ${this.usuarioActual.apellidos}`, 14, 36);
    doc.text(`Periodo: ${this.grupoSeleccionado.id_periodo}`, 14, 42); 
    doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString()}`, 14, 48);

    const data = this.listaAlumnosGrupo.map(al => [
      al.codEstudiante,
      al.nombresEstudiante,
      al.notaFinal,
      al.estado
    ]);
    
    autoTable(doc, {
      head: [['Matrícula', 'Nombre del Estudiante', 'Nota Final', 'Estado']],
      body: data,
      startY: 55,
      theme: 'grid',
      headStyles: { fillColor: [13, 110, 253] } 
    });

    const finalY = (doc as any).lastAutoTable.finalY || 55;
    doc.text('_______________________', 40, finalY + 40);
    doc.text('Firma del Docente', 45, finalY + 46);

    doc.text('_______________________', 130, finalY + 40);
    doc.text('Firma Dirección', 135, finalY + 46);

    doc.save(`Acta_Notas_${this.grupoSeleccionado.nombreMateria}_G${this.grupoSeleccionado.seccion}.pdf`);
    this.toast.success('Acta PDF descargada correctamente');
  }

  seleccionarFoto(event: any): void { this.archivoFoto = event.target.files[0]; }
  subirFoto(): void { 
    if (!this.archivoFoto) return; 
    const formData = new FormData(); formData.append('file', this.archivoFoto);
    this.http.post(`http://127.0.0.1:8000/api/usuarios/${this.usuarioActual.id_usuario}/foto`, formData).subscribe((res: any) => {
      this.usuarioActual.fotoPerfil = res.fotoPerfil; localStorage.setItem('usuario_actual', JSON.stringify(this.usuarioActual));
    });
  }
  actualizarPerfil(): void { 
    this.http.put(`http://127.0.0.1:8000/api/usuarios/${this.usuarioActual.id_usuario}/perfil`, this.perfilEdit).subscribe();
  }
}