import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, switchMap, of, catchError } from 'rxjs';

interface Cliente {
  uuid: string;
  nombre: string;
  apellido: string;
  telefono: string;
  direccion: string;
}

interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  precio: string;
  categoria: string;
  disponible: boolean;
  ingredientes: any[];
}

interface DetallePedido {
  producto: string;
  cantidad: number;
}

interface Pedido {
  id: string;
  cliente: string | null;
  cliente_db: string;
  detalle_pedido: DetallePedido[];
  total: string;
  fecha: string;
  direccion: string;
  estado: string;
  observacion: string;
  delivery: string | null;
  cajero: string;
}

interface PedidoCompleto extends Omit<Pedido, 'detalle_pedido'> {
  cliente_info?: Cliente;
  detalle_pedido: (DetallePedido & { producto_info?: Producto })[];
}

@Injectable({
  providedIn: 'root'
})
export class PedidosService {
  private backendUrl = environment.backendUrl;

  constructor(private readonly http: HttpClient) { }

  getAllOrders(): Observable<any> {
    return this.http.get(`${this.backendUrl}Pedido/`);
  }

  getOrderById(id: string): Observable<Pedido> {
    return this.http.get<Pedido>(`${this.backendUrl}Pedido/${id}`);
  }

  getProductById(id: string): Observable<Producto> {
    return this.http.get<Producto>(`${this.backendUrl}Producto/${id}`).pipe(
      map(response => {
        if (!response) {
          throw new Error('Producto no encontrado');
        }
        return response;
      }),
      catchError(error => {
        console.error(`Error obteniendo producto ${id}:`, error);
        return of({
          id: id,
          nombre: 'Producto no encontrado',
          descripcion: 'No disponible',
          precio: '0',
          categoria: 'N/A',
          disponible: false,
          ingredientes: []
        });
      })
    );
  }

  getClientById(id: string): Observable<Cliente> {
    return this.http.get<Cliente>(`${this.backendUrl}Cliente/${id}`).pipe(
      catchError(error => {
        console.error(`Error obteniendo cliente ${id}:`, error);
        return of({
          uuid: id,
          nombre: 'Cliente no encontrado',
          apellido: '',
          telefono: '',
          direccion: ''
        });
      })
    );
  }

  getPedidoCompleto(pedidoId: string): Observable<PedidoCompleto> {
    return this.getOrderById(pedidoId).pipe(
      switchMap(pedido => {
        const clienteObs = pedido.cliente_db ? 
          this.getClientById(pedido.cliente_db) : 
          of(undefined);

        const productosObs = pedido.detalle_pedido.map(detalle =>
          this.getProductById(detalle.producto).pipe(
            map(producto => ({
              ...detalle,
              producto_info: producto
            }))
          )
        );

        return forkJoin({
          pedido: of(pedido),
          cliente: clienteObs,
          detalles: forkJoin(productosObs)
        }).pipe(
          map(({ pedido, cliente, detalles }) => ({
            ...pedido,
            cliente_info: cliente,
            detalle_pedido: detalles
          }))
        );
      })
    );
  }

  getPedidosEnPreparacion(): Observable<PedidoCompleto[]> {
    return this.getAllOrders().pipe(
      map((pedidos: Pedido[]) => pedidos.filter(p => p.estado === 'PREPARACION')),
      switchMap(pedidos => {
        if (pedidos.length === 0) return of([]);
        return forkJoin(
          pedidos.map(pedido => this.getPedidoCompleto(pedido.id))
        );
      })
    );
  }

  updateOrderStatus(orderId: string, newStatus: string, cliente_db: string): Observable<any> {
    return this.http.patch(`${this.backendUrl}Pedido/${orderId}`, {
      estado: 'LISTO',
      cliente_db: cliente_db
    });
  }
}
