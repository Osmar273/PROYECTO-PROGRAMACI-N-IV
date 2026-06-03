import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Esta es la ruta exacta donde vive tu backend de Python
  private apiUrl = 'http://127.0.0.1:8000/api';

  // Inyectamos el HttpClient que configuramos
  constructor(private http: HttpClient) {}

  // Método que empaqueta el correo y la contraseña y los dispara por POST
  login(correo: string, password: string): Observable<any> {
    const body = { correo: correo, password: password };
    return this.http.post(`${this.apiUrl}/login`, body);
  }
}