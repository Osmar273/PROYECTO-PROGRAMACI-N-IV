import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class EstudianteService {
  // FIX: Estandarizado a la IP numérica para evitar bloqueos del navegador
  private apiUrl = 'http://127.0.0.1:8000/api';
  
  constructor(private http: HttpClient) {}

  getGruposDisponibles(): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/grupos/disponibles`); }
  getMaterias(): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/materias`); }
  inscribirMateria(datosInscripcion: any): Observable<any> { return this.http.post(`${this.apiUrl}/inscripciones`, datosInscripcion); }
  getMisInscripciones(idEstudiante: number): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/inscripciones/estudiante/${idEstudiante}`); }
  eliminarInscripcion(id: number): Observable<any> { return this.http.delete(`${this.apiUrl}/inscripciones/${id}`); }
}