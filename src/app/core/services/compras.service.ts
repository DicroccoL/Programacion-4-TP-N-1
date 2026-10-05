import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';

/** Datos de la orden que la pantalla del ticket necesita mostrar. */
export interface ComprobanteCompra {
  ordenId: string;
  codigoQr: string;
  subtotal?: number;
  descuento?: number;
  codigoCupon?: string | null;
  total: number;
  fechaCompra: string;
  estado: string;
  pelicula: string;
  fechaFuncion: string;
  sala: number;
  formato: string;
  idioma: string;
  butacas: string[];
}

/**
 * Coordina la creación de una compra y adapta su respuesta al comprobante.
 *
 * La RPC de Supabase valida la operación y registra la orden. Este servicio
 * no calcula precios ni decide si una reserva es válida: esas reglas viven
 * en la base de datos.
 *
 * Se utiliza al confirmar la compra desde la pantalla de selección de butacas.
 */
@Injectable({ providedIn: 'root' })
export class ComprasService {
  constructor(private readonly auth: AuthService) {}

  /**
   * Confirma la compra de las butacas reservadas y devuelve el comprobante.
   * @throws El error de Supabase o un error si la RPC no devuelve comprobante.
   */
  async crearOrden(
    funcionId: string,
    butacaIds: string[],
    token: string,
    fechaNacimiento: string | null,
    asisteAdulto: boolean,
  ): Promise<ComprobanteCompra> {
    const { data, error } = await this.auth.client.rpc('comprar_orden_con_comprobante', {
      p_funcion_id: funcionId,
      p_butaca_ids: butacaIds,
      p_token: token,
      p_fecha_nacimiento: fechaNacimiento,
      p_asiste_adulto: asisteAdulto,
    });
    if (error) throw error;

    const row = (data as Record<string, unknown>[] | null)?.[0];
    if (!row) throw new Error('No se recibió el comprobante de la orden. Volvé a intentarlo.');

    return {
      ordenId: String(row['orden_id']),
      codigoQr: String(row['codigo_qr']),
      total: Number(row['total']),
      subtotal: Number(row['subtotal'] ?? row['total']),
      descuento: Number(row['descuento'] ?? 0),
      codigoCupon: row['codigo_cupon'] == null ? null : String(row['codigo_cupon']),
      fechaCompra: String(row['fecha_compra']),
      estado: String(row['estado']),
      pelicula: String(row['pelicula']),
      fechaFuncion: String(row['fecha_funcion']),
      sala: Number(row['sala']),
      formato: String(row['formato']),
      idioma: String(row['idioma']),
      butacas: (row['butacas'] as string[] | null) ?? [],
    };
  }
}
