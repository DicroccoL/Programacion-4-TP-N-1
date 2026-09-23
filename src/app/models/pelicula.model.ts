export type ClasificacionEdad = 'ATP' | '+13' | '+18';
export type EstadoPelicula = 'EN_CARTELERA' | 'PROXIMAMENTE';

export interface Genero {
  id: string;
  nombre: string;
}

export interface Pelicula {
  id: string;
  titulo: string;
  genero: string;
  sinopsis: string;
  duracionMin: number;
  imagenUrl: string;
  clasificacion: ClasificacionEdad;
  estado: EstadoPelicula;
  preventaActiva: boolean;
  precioPreventa?: number | null;
  fechaEstreno?: string | null;
  createdAt?: string;
  
  generos?: Genero[];
}

// Tipo para el formulario de creación (excluye id y metadatos)
export type CrearPeliculaDTO = Omit<Pelicula, 'id' | 'createdAt' | 'generos'> & {
  generosIds?: string[];
};

export interface Resenia {
  id: string;
  peliculaId: string;
  usuarioId: string;
  puntaje: number;
  comentario?: string;
  createdAt?: string;
}