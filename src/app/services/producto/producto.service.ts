import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface Producto {
  id: string;
  ingredientes: any[];
  creado_por: string;
  nombre: string;
  descripcion: string;
  precio: string;
  categoria: string;
  disponible: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ProductoService {
  constructor(private readonly http: HttpClient) { }
  private backendUrl = environment.backendUrl;

  obtenerProductos(): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.backendUrl}Products/`);
  }

  obtenerProducto(id: string): Observable<Producto> {
    return this.http.get<Producto>(`${this.backendUrl}Products/${id}`);
  }
}
