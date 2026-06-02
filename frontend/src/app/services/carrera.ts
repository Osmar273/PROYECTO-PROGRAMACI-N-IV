import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CarreraService {
  private apiUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  getFacultades(): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/facultades`); }
  getModalidades(): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/modalidades`); }
  
  getCarreras(): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/carreras`); }
  crearCarrera(carrera: any): Observable<any> { return this.http.post(`${this.apiUrl}/carreras`, carrera); }
  eliminarCarrera(id: number): Observable<any> { return this.http.delete(`${this.apiUrl}/carreras/${id}`); }
}