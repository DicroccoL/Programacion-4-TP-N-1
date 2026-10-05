import { Injectable } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { AuthService } from './auth.service';
import { Butaca } from '../../models/cine.model';

/**
 * Gestiona el mapa de butacas y sus reservas temporales.
 *
 * Las reservas se identifican con un token de compra y se confirman en
 * Supabase para coordinar a los usuarios que están seleccionando asientos
 * al mismo tiempo. El canal Realtime avisa de cambios para que la pantalla
 * actualice el mapa.
 *
 * Se utiliza en la pantalla de selección de butacas.
 */
@Injectable({ providedIn: 'root' })
export class ButacasService {
  constructor(private readonly auth: AuthService) {}

  /**
   * Obtiene las butacas de la sala asociada a la función y marca las vendidas.
   * Las reservas temporales activas se consultan con obtenerReservasActivas.
   */
  async obtenerButacas(funcionId: string): Promise<Butaca[]> {
    const { data: funcion, error: errorFuncion } = await this.auth.client
      .from('funciones')
      .select('sala_id')
      .eq('id', funcionId)
      .single();
    if (errorFuncion) throw errorFuncion;

    const { data, error } = await this.auth.client
      .from('butacas')
      .select('*')
      .eq('sala_id', funcion.sala_id)
      .order('fila')
      .order('numero');
    if (error) throw error;

    const { data: compradas, error: errorEntradas } = await this.auth.client.rpc(
      'butacas_ocupadas_funcion',
      { p_funcion_id: funcionId },
    );
    if (errorEntradas) throw errorEntradas;

    const ocupadas = new Set((compradas ?? []).map((id: string) => String(id)));
    return (data ?? []).map((b: Record<string, unknown>) => ({
      id: String(b['id']),
      salaId: String(b['sala_id']),
      fila: String(b['fila']),
      numero: Number(b['numero']),
      tipo: b['tipo'] as Butaca['tipo'],
      ocupadaEnFuncion: ocupadas.has(String(b['id'])),
    }));
  }

  /** Lista las reservas que todavía no vencieron para una función. */
  async obtenerReservasActivas(
    funcionId: string,
  ): Promise<Array<{ butacaId: string; expiraEn: string }>> {
    const { data, error } = await this.auth.client
      .from('reservas_butacas')
      .select('butaca_id, expira_en')
      .eq('funcion_id', funcionId)
      .gt('expira_en', new Date().toISOString());
    if (error) throw error;

    return (data ?? []).map((r: Record<string, unknown>) => ({
      butacaId: String(r['butaca_id']),
      expiraEn: String(r['expira_en']),
    }));
  }

  /** Intenta reservar una butaca temporalmente con el token de compra. */
  async reservarButaca(funcionId: string, butacaId: string, token: string): Promise<string> {
    const { data, error } = await this.auth.client.rpc('tomar_reserva_butaca', {
      p_funcion_id: funcionId,
      p_butaca_id: butacaId,
      p_token: token,
    });
    if (error) throw error;
    return String(data);
  }

  /**
   * Libera las reservas del token. Si se pasan IDs, libera solo esas butacas;
   * si no, libera todas las reservas asociadas al token.
   */
  async liberarReservas(token: string, butacaIds?: string[]): Promise<void> {
    const { error } = await this.auth.client.rpc('liberar_reservas_butacas', {
      p_token: token,
      p_butaca_ids: butacaIds ?? null,
    });
    if (error) throw error;
  }

  /**
   * Se suscribe a cambios de reservas de una función.
   * El componente debe quitar el canal cuando deje de utilizarlo.
   */
  canalReservas(funcionId: string, alCambiar: () => void): RealtimeChannel {
    return this.auth.client
      .channel(`reservas-funcion-${funcionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservas_butacas',
          filter: `funcion_id=eq.${funcionId}`,
        },
        alCambiar,
      )
      .subscribe();
  }
}
