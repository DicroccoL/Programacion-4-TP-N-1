export interface CategoriaCandy {
  id: string;
  nombre: string;
}

export interface ProductoCandy {
  id: string;
  categoriaId: string;
  nombre: string;
  precio: number;
  puntosNecesarios?: number;
}

export interface Combo {
  id: string;
  nombre: string;
  precioFijo: number;
  incluyeEntrada: boolean;
  destacado: boolean;
  
  // Relación con los productos específicos que incluye
  productosIncluidos?: { productoId: string; cantidad: number; producto?: ProductoCandy }[];
}