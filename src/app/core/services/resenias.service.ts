import { Injectable } from '@angular/core';
import { Resenia } from '../../models/pelicula.model';
import { AuthService } from './auth.service';

export interface ResumenResenias {
  promedio: number;
  total: number;
}

/**
 * Acceso a datos de reseñas en Supabase.
 * Centraliza la lectura de opiniones, sus promedios y el guardado por película
 */
@Injectable({ providedIn: 'root' })
export class ReseniasService {
  constructor(private readonly authService: AuthService) {}

  /**
   * Obtiene el promedio y la cantidad de reseñas para cada película solicitada.
   * Devuelve un objeto indexado por ID para asociar cada resumen con su película.
   * @throws El error devuelto por Supabase si falla la consulta RPC.
   */
  async obtenerResumenes(peliculaIds: string[]): Promise<Record<string, ResumenResenias>> {
    if (peliculaIds.length === 0) return {};

    const { data, error } = await this.authService.client.rpc('obtener_resumenes_resenias', {
      p_pelicula_ids: peliculaIds,
    });

    if (error) throw error;

    return Object.fromEntries((data ?? []).map((fila: {
      pelicula_id: string;
      promedio: number | string;
      total: number | string;
    }) => [String(fila['pelicula_id']), {
      promedio: Number(fila['promedio']),
      total: Number(fila['total']),
    }]));
  }

  /**
   * Obtiene las reseñas de una película, con nombre público del autor,
   * ordenadas por fecha descendente. Requiere la RPC
   * @throws El error devuelto por Supabase si falla la consulta RPC.
   */
  async obtenerPorPelicula(peliculaId: string): Promise<Resenia[]> {
    const { data, error } = await this.authService.client.rpc('obtener_resenias_pelicula', {
      p_pelicula_id: peliculaId,
    });

    if (error) throw error;

    const filas = (data ?? []) as Record<string, unknown>[];

    return filas.map((fila) => ({
      id: String(fila['id']),
      peliculaId: String(fila['pelicula_id']),
      usuarioId: String(fila['usuario_id']),
      nombreAutor: String(fila['nombre_autor'] ?? '').trim() || 'Usuario',
      puntaje: Number(fila['puntaje']),
      comentario: fila['comentario'] == null ? undefined : String(fila['comentario']),
      createdAt: fila['created_at'] == null ? undefined : String(fila['created_at']),
    }));
  }

  /**
   * Crea o actualiza la reseña de un usuario para una película.
   * La combinación película-usuario debe ser única en Supabase; el comentario
   * vacío se guarda como `null`.
   */
  /** Inserta o actualiza una reseña por película y usuario. */
  async guardar(
    peliculaId: string,
    usuarioId: string,
    puntaje: number,
    comentario: string,
  ): Promise<void> {
    const { error } = await this.authService.client.from('resenias').upsert(
      {
        pelicula_id: peliculaId,
        usuario_id: usuarioId,
        puntaje,
        comentario: comentario.trim() || null,
      },
      { onConflict: 'pelicula_id,usuario_id' },
    );

    if (error) throw error;
  }
}
// a futuro voy a agregar la opcion de siendo admin borrar reseñas de otros usuarios
