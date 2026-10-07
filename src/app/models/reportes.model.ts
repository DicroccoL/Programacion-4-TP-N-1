/** Cada interface describe una respuesta de las RPC de reportes de Supabase. */
export interface VentaDia {
  dia: string;
  facturacion: number;
  entradas_vendidas: number;
}

export interface PeliculaVendida {
  pelicula_id: string;
  titulo: string;
  entradas_vendidas: number;
}

export interface ProductoVendido {
  producto: string;
  cantidad_vendida: number;
}

export interface Actividad {
  actividad_id: string;
  correo: string | null;
  accion: string;
  detalle: string;
  fecha_hora: string;
}

/** Agrupa los cuatro resultados que necesita la pantalla administrativa. */
export interface ReportesAdmin {
  ventas: VentaDia[];
  peliculas: PeliculaVendida[];
  productos: ProductoVendido[];
  actividades: Actividad[];
}
