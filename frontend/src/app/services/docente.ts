import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DocenteService {
  // Usamos la IP numérica para evitar bloqueos CORS
  private apiUrl = 'http://127.0.0.1:8000/api';

  constructor(private http: HttpClient) {}

  getMaterias(): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/materias`); }
  getGrupos(): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/grupos`); }
  getEstudiantes(): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/usuarios/estudiantes`); }
  getInscripciones(): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/inscripciones`); }

  // Actualiza el estado de la inscripción (Ej: 'Aprobado', 'Reprobado')
  actualizarEstadoInscripcion(idInscripcion: number, payload: any): Observable<any> { 
    return this.http.put(`${this.apiUrl}/inscripciones/${idInscripcion}`, payload); 
  }

  // Guarda la nota numérica en la tabla Notas
  guardarNotaFinal(nota: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/notas`, nota);
  }
}