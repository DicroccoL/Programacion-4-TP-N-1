import { Injectable } from '@angular/core';
import { Resenia } from '../../models/pelicula.model';
import { AuthService } from './auth.service';

export interface ResumenResenias {
  promedio: number;
  total: number;
}

@Injectable({ providedIn: 'root' })
export class ReseniasService {
  constructor(private readonly authService: AuthService) {}

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

  async obtenerPorPelicula(peliculaId: string): Promise<Resenia[]> {
    const { data, error } = await this.authService.client
      .from('resenias')
      .select('id, pelicula_id, usuario_id, puntaje, comentario, created_at')
      .eq('pelicula_id', peliculaId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data ?? []).map((fila) => ({
      id: String(fila['id']),
      peliculaId: String(fila['pelicula_id']),
      usuarioId: String(fila['usuario_id']),
      puntaje: Number(fila['puntaje']),
      comentario: fila['comentario'] == null ? undefined : String(fila['comentario']),
      createdAt: fila['created_at'] == null ? undefined : String(fila['created_at']),
    }));
  }

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
