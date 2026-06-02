import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DocenteService {
  private apiUrl = 'http://127.0.0.1:8000/api';

  constructor(private http: HttpClient) {}

  getMaterias(): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/materias`); }
  getGrupos(): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/grupos`); }
  getEstudiantes(): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/usuarios/estudiantes`); }
  getInscripciones(): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/inscripciones`); }
  actualizarEstadoInscripcion(id: number, data: any): Observable<any> { return this.http.put(`${this.apiUrl}/inscripciones/${id}`, data); }
  
  // --- EVALUACIONES DINÁMICAS ---
  getEvaluacionesGrupo(idGrupo: number): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/evaluaciones/grupo/${idGrupo}`); }
  crearEvaluacion(evaluacion: any): Observable<any> { return this.http.post(`${this.apiUrl}/evaluaciones`, evaluacion); }
  eliminarEvaluacion(id: number): Observable<any> { return this.http.delete(`${this.apiUrl}/evaluaciones/${id}`); }
  
  getNotas(): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/notas`); }
  guardarNotaEval(nota: any): Observable<any> { return this.http.post(`${this.apiUrl}/notas/evaluacion`, nota); }
}