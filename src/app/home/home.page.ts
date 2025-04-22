import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

interface OrderItem {
  name: string;
  description: string;
}

interface Order {
  id: number;
  clientName: string;
  orderTime: Date;
  items: OrderItem[];
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
})
export class HomePage implements OnInit {
  currentTime: string = '';
  activeOrders: Order[] = [];
  completedOrders: Order[] = [];
  selectedOrderIndex: number = 0;
  showingCompletedOrders: boolean = false;
  columns: number = 3; // Número de columnas en el grid

  constructor() {
    // Sample orders for demonstration
    this.activeOrders = [
      {
        id: 1,
        clientName: 'Juan Pérez',
        orderTime: new Date(),
        items: [
          { name: 'Hand Roll', description: 'Camarón, palta, envuelto en panko' },
          { name: 'Gohan', description: 'Arroz blanco' }
        ]
      },
      {
        id: 2,
        clientName: 'María González',
        orderTime: new Date(Date.now() - 30 * 60000),
        items: [
          { name: 'Hand Roll', description: 'Salmón, queso crema' }
        ]
      }
    ];
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    const currentOrders = this.showingCompletedOrders ? this.completedOrders : this.activeOrders;
    
    switch(event.key) {
      case '4': // Izquierda
        if (this.selectedOrderIndex % this.columns > 0) {
          this.selectedOrderIndex--;
        }
        break;
      case '6': // Derecha
        if (this.selectedOrderIndex % this.columns < this.columns - 1 && 
            this.selectedOrderIndex < currentOrders.length - 1) {
          this.selectedOrderIndex++;
        }
        break;
      case '8': // Arriba
        if (this.selectedOrderIndex >= this.columns) {
          this.selectedOrderIndex -= this.columns;
        }
        break;
      case '2': // Abajo
        if (this.selectedOrderIndex + this.columns < currentOrders.length) {
          this.selectedOrderIndex += this.columns;
        }
        break;
      case '0': // Finalizar pedido
        if (!this.showingCompletedOrders && currentOrders[this.selectedOrderIndex]) {
          this.completeOrder(currentOrders[this.selectedOrderIndex].id);
        }
        break;
      case '3': // Cambiar entre activos y completados
        this.toggleOrdersView();
        break;
    }
  }

  ngOnInit() {
    this.updateTime();
    setInterval(() => this.updateTime(), 60000);
  }

  updateTime() {
    this.currentTime = new Date().toLocaleTimeString();
  }

  getLateOrders(): number {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60000);
    return this.activeOrders.filter(order => order.orderTime < thirtyMinutesAgo).length;
  }

  completeOrder(orderId: number) {
    const orderIndex = this.activeOrders.findIndex(order => order.id === orderId);
    if (orderIndex !== -1) {
      const completedOrder = this.activeOrders.splice(orderIndex, 1)[0];
      this.completedOrders.unshift(completedOrder);
      if (this.selectedOrderIndex >= this.activeOrders.length) {
        this.selectedOrderIndex = Math.max(0, this.activeOrders.length - 1);
      }
    }
  }

  toggleOrdersView() {
    this.showingCompletedOrders = !this.showingCompletedOrders;
    this.selectedOrderIndex = 0;
  }

  getOrderTimeString(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  isLateOrder(orderTime: Date): boolean {
    return orderTime < new Date(Date.now() - 30 * 60000);
  }

  get displayedOrders() {
    return this.showingCompletedOrders ? this.completedOrders : this.activeOrders;
  }
}
