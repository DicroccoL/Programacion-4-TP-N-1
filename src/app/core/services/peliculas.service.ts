import { Injectable } from '@angular/core';
import { CrearPeliculaDTO, Pelicula } from '../../models/pelicula.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
/**
 * Servicio de acceso a datos para películas.
 *
 * Se encarga de hablar directamente con Supabase para consultar y persistir
 * la entidad `peliculas`. Su responsabilidad es leer/escribir datos, no
 * manejar la UI ni el estado del panel de administración.
 *
 * Se usa desde:
 * - componentes de la parte pública (inicio, detalle)
 * - `PeliculasCrudService`, que agrega el estado reactivo del CRUD del admin
 */
export class PeliculasService {
  constructor(private readonly authService: AuthService) {}

  /**
   * Devuelve todas las películas registradas, ordenadas por fecha de estreno.
   * Se usa cuando se necesitan consultar todos los registros del catálogo.
   */
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

  /**
   * Devuelve solo las películas que están actualmente en cartelera.
   * Se usa en la pantalla principal para mostrar la sección de cartelera.
   */
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

  /**
   * Devuelve las películas próximas a estrenarse.
   * Se usa para la sección "Próximamente" del inicio.
   */
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

  /**
   * Busca una película por su identificador.
   * Se usa en páginas de detalle o para preparar edición de un registro.
   */
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

  /**
   * Crea una nueva película en Supabase.
   * Se usa desde el CRUD del admin cuando se quiere registrar una película.
   */
  async crear(datos: CrearPeliculaDTO): Promise<void> {
    const { error } = await this.authService.client
      .from('peliculas')
      .insert(this.formatearParaSupabase(datos));

    if (error) {
      throw error;
    }
  }

  /**
   * Actualiza una película existente por id.
   * Se usa cuando el admin modifica una película ya creada.
   */
  async actualizar(id: string, datos: CrearPeliculaDTO): Promise<void> {
    const { error } = await this.authService.client
      .from('peliculas')
      .update(this.formatearParaSupabase(datos))
      .eq('id', id);

    if (error) {
      throw error;
    }
  }

  /**
   * Elimina una película por id.
   * Se usa desde el listado del panel administrativo.
   */
  async eliminar(id: string): Promise<void> {
    const { error } = await this.authService.client
      .from('peliculas')
      .delete()
//No utilizar Delete utilizar Bajas logicas
      .eq('id', id);

    if (error) {
      throw error;
    }
  }

  /**
   * Convierte un registro de Supabase a la estructura interna `Pelicula`.
   * Centraliza el mapeo entre nombres de columnas de la base y el modelo de la app.
   */
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

  /**
   * Ajusta el payload antes de insertar/actualizar en Supabase.
   * Convierte los nombres del modelo de app al formato que usa la base.
   */
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
