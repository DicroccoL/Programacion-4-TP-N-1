import { Injectable } from '@angular/core';
import { CrearPeliculaDTO, Pelicula } from '../../models/pelicula.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class PeliculasService {
  constructor(private readonly authService: AuthService) {}

  async obtenerTodas(): Promise<Pelicula[]> {
    const { data, error } = await this.authService.client
      .from('peliculas')
      .select('*')
      .order('fecha_estreno', { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []).map((pelicula) => this.mapearPelicula(pelicula));
  }

  async obtenerCartelera(): Promise<Pelicula[]> {
    const { data, error } = await this.authService.client
      .from('peliculas')
      .select('*')
      .eq('estado', 'EN_CARTELERA')
      .order('fecha_estreno', { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []).map((pelicula) => this.mapearPelicula(pelicula));
  }

  async obtenerProximamente(): Promise<Pelicula[]> {
    const { data, error } = await this.authService.client
      .from('peliculas')
      .select('*')
      .eq('estado', 'PROXIMAMENTE')
      .order('fecha_estreno', { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []).map((pelicula) => this.mapearPelicula(pelicula));
  }

  async obtenerPorId(id: string): Promise<Pelicula> {
    const { data, error } = await this.authService.client
      .from('peliculas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    return this.mapearPelicula(data);
  }

  async crear(datos: CrearPeliculaDTO): Promise<void> {
    const { error } = await this.authService.client
      .from('peliculas')
      .insert(this.formatearParaSupabase(datos));

    if (error) {
      throw error;
    }
  }

  async actualizar(id: string, datos: CrearPeliculaDTO): Promise<void> {
    const { error } = await this.authService.client
      .from('peliculas')
      .update(this.formatearParaSupabase(datos))
      .eq('id', id);

    if (error) {
      throw error;
    }
  }

  async eliminar(id: string): Promise<void> {
    const { error } = await this.authService.client
      .from('peliculas')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  }

  private mapearPelicula(pelicula: Record<string, unknown>): Pelicula {
    return {
      id: String(pelicula['id']),
      titulo: String(pelicula['titulo'] ?? ''),
      genero: String(
        pelicula['genero'] ??
          (Array.isArray(pelicula['generos'])
            ? pelicula['generos']
                .map((genero) => String((genero as Record<string, unknown>)['nombre'] ?? ''))
                .filter(Boolean)
                .join(', ')
            : ''),
      ),
      sinopsis: String(pelicula['sinopsis'] ?? ''),
      duracionMin: Number(pelicula['duracion_min'] ?? 0),
      imagenUrl: String(pelicula['imagen_url'] ?? ''),
      clasificacion: pelicula['clasificacion'] as Pelicula['clasificacion'],
      estado: pelicula['estado'] as Pelicula['estado'],
      preventaActiva: Boolean(pelicula['preventa_activa'] ?? false),
      precioPreventa: pelicula['precio_preventa'] as number | null | undefined,
      fechaEstreno: pelicula['fecha_estreno'] as string | null | undefined,
      createdAt: pelicula['created_at'] as string | undefined,
      generos: Array.isArray(pelicula['generos'])
        ? pelicula['generos'].map((genero) => ({
            id: String((genero as Record<string, unknown>)['id']),
            nombre: String((genero as Record<string, unknown>)['nombre'] ?? ''),
          }))
        : undefined,
    };
  }

  private formatearParaSupabase(datos: CrearPeliculaDTO) {
    return {
      titulo: datos.titulo.trim(),
      genero: datos.genero.trim(),
      sinopsis: datos.sinopsis.trim(),
      duracion_min: datos.duracionMin,
      imagen_url: datos.imagenUrl.trim(),
      clasificacion: datos.clasificacion,
      estado: datos.estado,
      preventa_activa: datos.preventaActiva,
      precio_preventa: datos.precioPreventa ?? null,
      fecha_estreno: datos.fechaEstreno || null,
    };
  }
}
