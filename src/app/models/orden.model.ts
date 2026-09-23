import { Funcion, Butaca } from './cine.model';
import { ProductoCandy, Combo } from './candybar.model';

export type EstadoOrden = 'PENDIENTE' | 'PAGADA' | 'CANCELADA';

export interface Cupon {
  id: string;
  codigo: string;
  porcentajeDescuento: number;
  edadMinima?: number;
}

export interface Orden {
  id: string;
  usuarioId?: string; // Opcional por si es compra anónima
  total: number;
  creditoUsado: number;
  puntosGenerados: number;
  codigoQr: string;
  qrUsadoEntradas: boolean;
  qrUsadoCandy: boolean;
  estado: EstadoOrden;
  fechaCompra: string;
}

export interface Entrada {
  id: string;
  ordenId: string;
  funcionId: string;
  butacaId: string;
  requiereAdulto: boolean;
  precioAbonado: number;
  
  // Relaciones
  funcion?: Funcion;
  butaca?: Butaca;
}

export interface OrdenCandy {
  id: string;
  ordenId: string;
  productoId?: string;
  comboId?: string;
  cantidad: number;
  precioAbonado: number;
  
  // Relaciones
  producto?: ProductoCandy;
  combo?: Combo;
}