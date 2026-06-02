import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AcademicoService {
  private apiUrl = 'http://127.0.0.1:8000/api';

  constructor(private http: HttpClient) {}

  getRoles(): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/roles`); }
  
  getDocentes(): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/usuarios/docentes`); }
  crearDocente(docente: any): Observable<any> { return this.http.post(`${this.apiUrl}/usuarios/docentes`, docente); }
  actualizarDocente(id: number, docente: any): Observable<any> { return this.http.put(`${this.apiUrl}/usuarios/docentes/${id}`, docente); }
  eliminarDocente(id: number): Observable<any> { return this.http.delete(`${this.apiUrl}/usuarios/docentes/${id}`); }
  
  getEstudiantes(): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/usuarios/estudiantes`); }
  crearEstudiante(estudiante: any): Observable<any> { return this.http.post(`${this.apiUrl}/usuarios/estudiantes`, estudiante); }
  actualizarEstudiante(id: number, estudiante: any): Observable<any> { return this.http.put(`${this.apiUrl}/usuarios/estudiantes/${id}`, estudiante); }
  eliminarEstudiante(id: number): Observable<any> { return this.http.delete(`${this.apiUrl}/usuarios/estudiantes/${id}`); }

  getMaterias(): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/materias`); }
  crearMateria(materia: any): Observable<any> { return this.http.post(`${this.apiUrl}/materias`, materia); }
  eliminarMateria(id: number): Observable<any> { return this.http.delete(`${this.apiUrl}/materias/${id}`); }
  
  // --- PREREQUISITOS ---
  crearPrerequisito(datos: any): Observable<any> { return this.http.post(`${this.apiUrl}/materias/prerequisitos`, datos); }
  eliminarPrerequisito(idMat: number, idPre: number): Observable<any> { return this.http.delete(`${this.apiUrl}/materias/prerequisitos/${idMat}/${idPre}`); }
  
  getGrupos(): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/grupos`); }
  crearGrupo(grupo: any): Observable<any> { return this.http.post(`${this.apiUrl}/grupos`, grupo); }
  eliminarGrupo(id: number): Observable<any> { return this.http.delete(`${this.apiUrl}/grupos/${id}`); }

  getPeriodos(): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/periodos`); }
  getAulas(): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/aulas`); }
}