import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { PedidosService } from '../services/pedidos/pedidos.service';
import { ProductoService } from '../services/producto/producto.service';
import { UsuarioService } from '../services/usuario/usuario.service';
import { firstValueFrom } from 'rxjs';
import { addIcons } from 'ionicons';
import { checkmarkOutline, fastFoodOutline, warningOutline } from 'ionicons/icons';

// Interfaces para los tipos de datos
interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  precio: string;
  categoria: string;
  disponible: boolean;
}

interface Cliente {
  uuid: string;
  nombre: string;
  apellido: string;
  telefono: string;
  direccion: string;
}

interface ItemPedido {
  producto: string;
  cantidad: number;
  productoInfo?: Producto;
}

interface Pedido {
  id: string;
  cliente: string | null;
  cliente_db: string;
  detalle_pedido: ItemPedido[];
  total: string;
  fecha: string;
  direccion: string;
  estado: string;
  observacion: string;
  delivery: any;
  cajero: string;
  clienteInfo?: Cliente;
  orderTime?: Date;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
})
export class HomePage implements OnInit, OnDestroy {
  currentTime: string = '';
  activeOrders: Pedido[] = [];
  completedOrders: Pedido[] = [];
  selectedOrderIndex: number = 0;
  showingCompletedOrders: boolean = false;
  columns: number = 3;
  isLoading: boolean = true;
  isUpdating: boolean = false;
  isInitialLoad: boolean = true;
  errorMessage: string | null = null;
  private updateInterval: any;

  // Paginación
  itemsPerPage: number = 8;
  currentPage: number = 1;

  constructor(
    private pedidosService: PedidosService,
    private productoService: ProductoService,
    private usuarioService: UsuarioService
  ) {
    addIcons({
      'checkmark-outline': checkmarkOutline,
      'fast-food-outline': fastFoodOutline,
      'warning-outline': warningOutline
    });
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    const currentOrders = this.getCurrentPageOrders();
    const columns = Math.floor(window.innerWidth / 280);

    switch(event.key) {
      case '4': // Izquierda
        if (this.selectedOrderIndex % columns > 0) {
          this.selectedOrderIndex--;
        }
        break;
      case '6': // Derecha
        if (this.selectedOrderIndex % columns < columns - 1 && 
            this.selectedOrderIndex < currentOrders.length - 1) {
          this.selectedOrderIndex++;
        }
        break;
      case '8': // Arriba
        if (this.selectedOrderIndex >= columns) {
          this.selectedOrderIndex -= columns;
        }
        break;
      case '2': // Abajo
        if (this.selectedOrderIndex + columns < currentOrders.length) {
          this.selectedOrderIndex += columns;
        }
        break;
      case '0': // Finalizar pedido
        if (!this.showingCompletedOrders && currentOrders[this.selectedOrderIndex]) {
          const order = currentOrders[this.selectedOrderIndex];
          this.completeOrder(order.id, order.cliente_db);
        }
        break;
      case '3': // Cambiar entre activos y completados
        this.toggleOrdersView();
        break;
      case '7': // Página anterior
        this.previousPage();
        break;
      case '9': // Página siguiente
        this.nextPage();
        break;
    }
  }

  ngOnInit() {
    this.updateTime();
    this.loadOrders();
    this.updateInterval = setInterval(() => this.loadOrders(), 30000);
  }

  ngOnDestroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }

  async loadOrders() {
    try {
      if (this.isInitialLoad) {
        this.isLoading = true;
      } else {
        this.isUpdating = true;
      }
      this.errorMessage = null;
      
      const pedidosResponse = await firstValueFrom(this.pedidosService.getAllOrders());
      
      if (!Array.isArray(pedidosResponse)) {
        throw new Error('La respuesta de pedidos no es un array');
      }

      console.log('=== TODOS LOS PEDIDOS RECIBIDOS ===');
      pedidosResponse.forEach((pedido, index) => {
        console.log(`\nPedido ${index + 1}:`, {
          id: pedido.id,
          cliente: pedido.cliente,
          cliente_db: pedido.cliente_db,
          estado: pedido.estado,
          fecha: pedido.fecha,
          detalle_pedido: pedido.detalle_pedido
        });
      });

      // Primero obtenemos todos los clientes usando cliente_db
      const clientesResponse = await firstValueFrom(this.usuarioService.obtenerClientes());
      console.log('\n=== TODOS LOS CLIENTES RECIBIDOS ===');
      console.log(clientesResponse);

      const clientesMap = new Map<string, Cliente>(
        clientesResponse.map((c: any) => [c.uuid, c])
      );

      const pedidosPromises = pedidosResponse.map(async (pedido: any) => {
        let clienteInfo = clientesMap.get(pedido.cliente_db);
        
        if (!clienteInfo && pedido.cliente !== null) {
          try {
            console.log('Intentando obtener cliente con ID:', pedido.cliente);
            if (pedido.cliente) {
              clienteInfo = await firstValueFrom(this.usuarioService.obtenerclientesid(pedido.cliente));
            } else {
              console.error('ID de cliente no disponible');
            }
          } catch (error) {
            console.error(`Error al obtener cliente individual:`, error);
          }
        }

        const pedidoEnriquecido: Pedido = {
          ...pedido,
          clienteInfo: clienteInfo,
          orderTime: this.parseFechaString(pedido.fecha)
        };

        const itemsPromises = pedido.detalle_pedido.map(async (item: any) => {
          try {
            const producto = await firstValueFrom(
              this.productoService.obtenerProducto(item.producto)
            );
            return {
              ...item,
              productoInfo: producto
            };
          } catch (error) {
            console.error(`Error obteniendo producto ${item.producto}:`, error);
            return {
              ...item,
              productoInfo: {
                id: item.producto,
                nombre: 'Producto no encontrado',
                descripcion: 'No disponible',
                precio: '0',
                categoria: 'ERROR',
                disponible: false
              }
            };
          }
        });

        pedidoEnriquecido.detalle_pedido = await Promise.all(itemsPromises);
        return pedidoEnriquecido;
      });

      const allOrders = await Promise.all(pedidosPromises);
      
      // Separar pedidos activos y completados
      this.activeOrders = allOrders.filter(order => order.estado === 'PREPARACION');
      this.completedOrders = allOrders.filter(order => order.estado === 'LISTO');
      
      // Ajustar índice seleccionado si es necesario
      const currentOrders = this.showingCompletedOrders ? this.completedOrders : this.activeOrders;
      if (this.selectedOrderIndex >= currentOrders.length) {
        this.selectedOrderIndex = Math.max(0, currentOrders.length - 1);
      }
    } catch (error) {
      console.error('Error al cargar pedidos:', error);
      this.errorMessage = 'Error al cargar pedidos. Intente nuevamente.';
      this.activeOrders = [];
      this.completedOrders = [];
    } finally {
      this.isLoading = false;
      this.isUpdating = false;
      this.isInitialLoad = false;
    }
  }

  private parseFechaString(fechaString: string): Date {
    try {
      const [datePart, timePart] = fechaString.split(' ');
      const [day, month, year] = datePart.split('-').map(Number);
      const [hours, minutes] = timePart.split(':').map(Number);
      const fullYear = 2000 + year;
      return new Date(fullYear, month - 1, day, hours, minutes);
    } catch (e) {
      console.error('Error al parsear fecha:', e);
      return new Date();
    }
  }

  async completeOrder(orderId: string, cliente_db: string) {
    try {
      const orderToComplete = this.activeOrders.find(order => order.id === orderId);
      if (orderToComplete) {
        this.activeOrders = this.activeOrders.filter(order => order.id !== orderId);
        orderToComplete.estado = 'LISTO';
        this.completedOrders = [orderToComplete, ...this.completedOrders];
      }

      await firstValueFrom(this.pedidosService.updateOrderStatus(orderId, 'LISTO', cliente_db));
      
      this.loadOrders();
    } catch (error) {
      console.error('Error al completar pedido:', error);
      this.loadOrders();
    }
  }

  toggleOrdersView() {
    this.showingCompletedOrders = !this.showingCompletedOrders;
    this.selectedOrderIndex = 0;
    this.currentPage = 1;
  }

  updateTime() {
    this.currentTime = new Date().toLocaleTimeString();
  }

  getLateOrders(): number {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60000);
    return this.activeOrders.filter(order => {
      return order.orderTime && order.orderTime < thirtyMinutesAgo;
    }).length;
  }

  isOrderLate(fechaString: string): boolean {
    const orderDate = this.parseFechaString(fechaString);
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60000);
    return orderDate < thirtyMinutesAgo;
  }

  getNombreCliente(pedido: Pedido): string {
    return pedido.clienteInfo ? 
      `${pedido.clienteInfo.nombre} ${pedido.clienteInfo.apellido}` : 
      'Cliente sin nombre';
  }

  getStatusColor(estado: string): string {
    switch(estado) {
      case 'PREPARACION': return 'warning';
      case 'ENTREGADO': return 'success';
      case 'CANCELADO': return 'danger';
      default: return 'primary';
    }
  }

  get displayedOrders() {
    return this.showingCompletedOrders ? this.completedOrders : this.activeOrders;
  }

  getOrderTimeString(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  async handleRefresh(event: any) {
    await this.loadOrders();
    event.target.complete();
  }

  // Métodos de paginación
  getCurrentPageOrders(): Pedido[] {
    const orders = this.showingCompletedOrders ? this.completedOrders : this.activeOrders;
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return orders.slice(startIndex, startIndex + this.itemsPerPage);
  }

  getTotalPages(): number {
    const orders = this.showingCompletedOrders ? this.completedOrders : this.activeOrders;
    return Math.ceil(orders.length / this.itemsPerPage);
  }

  nextPage() {
    if (this.currentPage < this.getTotalPages()) {
      this.currentPage++;
      this.selectedOrderIndex = 0;
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.selectedOrderIndex = 0;
    }
  }
}