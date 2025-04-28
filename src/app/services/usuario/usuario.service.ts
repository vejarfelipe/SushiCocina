import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
@Injectable({
  providedIn: 'root'
})
export class UsuarioService {

  constructor( private readonly http: HttpClient) { }

  backendUrl = environment.backendUrl;

  obtenerClientes(): Observable<any> {
    return this.http.get(`${this.backendUrl}Cliente/`);
  }
  obtenerclientesid(id: string): Observable<any> {
    return this.http.get(`${this.backendUrl}users/getUser/${id}`);
  }

}
