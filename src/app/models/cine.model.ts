import { Pelicula } from './pelicula.model';

export type TipoButaca = 'NORMAL' | 'ACCESIBLE' | 'VIP';
export type FormatoProyeccion = '2D' | '3D' | '4D' | '5D';
export type IdiomaFuncion = 'CASTELLANO' | 'SUBTITULADA';

export interface Sala {
  id: string;
  numero: number;
}

export interface Butaca {
  id: string;
  salaId: string;
  fila: string;
  numero: number;
  tipo: TipoButaca;
  ocupadaEnFuncion?: boolean; // Útil para mapear el estado en tiempo real en la UI
}

export interface Funcion {
  id: string;
  peliculaId: string;
  salaId: string;
  fechaHoraInicio: string;
  fechaHoraFin: string;
  formato: FormatoProyeccion;
  idioma: IdiomaFuncion;
  precioBase: number;
  
  // Relaciones
  pelicula?: Pelicula;
  sala?: Sala;
}