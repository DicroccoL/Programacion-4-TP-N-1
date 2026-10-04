import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { Butaca, FormatoProyeccion, Funcion, IdiomaFuncion, Sala } from '../../models/cine.model';
import { Pelicula } from '../../models/pelicula.model';

export interface CrearSalaDTO { numero: number; formatos: FormatoProyeccion[]; idiomas: IdiomaFuncion[]; }
export interface CrearFuncionDTO {
  peliculaId: string; fechaHoraInicio: string; formato: FormatoProyeccion;
  idioma: IdiomaFuncion; precioBase: number;
}
export interface ComprobanteCompra {
  ordenId: string; codigoQr: string; subtotal?: number; descuento?: number; codigoCupon?: string | null;
  total: number; fechaCompra: string; estado: string;
  pelicula: string; fechaFuncion: string; sala: number; formato: string; idioma: string; butacas: string[];
}

@Injectable({ providedIn: 'root' })
export class ProgramacionService {
  constructor(private readonly auth: AuthService) {}

  async listarSalas(): Promise<Sala[]> {
    const { data, error } = await this.auth.client.from('salas').select('*').order('numero');
    if (error) throw error;
    return (data ?? []).map((s: Record<string, unknown>) => ({
      id: String(s['id']), numero: Number(s['numero']),
      formatos: (s['formatos'] as FormatoProyeccion[] | null) ?? ['2D'],
      idiomas: (s['idiomas'] as IdiomaFuncion[] | null) ?? ['CASTELLANO'],
    }));
  }

  async crearSala(dto: CrearSalaDTO): Promise<void> {
    const { error } = await this.auth.client.rpc('crear_sala_con_butacas', {
      p_numero: dto.numero, p_formatos: dto.formatos, p_idiomas: dto.idiomas,
    });
    if (error) throw error;
  }

  async obtenerPrecioEntradaBase(): Promise<number> {
    const { data, error } = await this.auth.client.rpc('obtener_precio_entrada_base');
    if (error) throw error;
    const precio = Number(data);
    if (!Number.isFinite(precio) || precio <= 0) throw new Error('Configurá un precio base válido en Configuración antes de programar funciones.');
    return precio;
  }

  async actualizarPrecioEntradaBase(precio: number): Promise<void> {
    const { error } = await this.auth.client.rpc('actualizar_precio_entrada_base', { p_valor: precio });
    if (error) throw error;
  }

  async crearFuncion(dto: CrearFuncionDTO): Promise<void> {
    const { error } = await this.auth.client.rpc('crear_funcion_con_sala_automatica', {
      p_pelicula_id: dto.peliculaId,
      p_fecha_hora_inicio: new Date(dto.fechaHoraInicio).toISOString(),
      p_formato: dto.formato, p_idioma: dto.idioma, p_precio_base: dto.precioBase,
    });
    if (error) throw error;
  }

  async eliminarFuncion(funcionId: string): Promise<void> {
    const { error } = await this.auth.client.rpc('eliminar_funcion', { p_funcion_id: funcionId });
    if (error) throw error;
  }

  async listarFunciones(peliculaId?: string): Promise<Funcion[]> {
    let query = this.auth.client.from('funciones')
      .select('*, salas(id, numero), peliculas(id, titulo, duracion_min, imagen_url, clasificacion, estado, preventa_activa)')
      .gte('fecha_hora_inicio', new Date().toISOString())
      .order('fecha_hora_inicio');
    if (peliculaId) query = query.eq('pelicula_id', peliculaId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((f: Record<string, unknown>) => {
      const sala = f['salas'] as Record<string, unknown> | null;
      const pelicula = f['peliculas'] as Record<string, unknown> | null;
      return {
        id: String(f['id']), peliculaId: String(f['pelicula_id']), salaId: String(f['sala_id']),
        fechaHoraInicio: String(f['fecha_hora_inicio']), fechaHoraFin: String(f['fecha_hora_fin']),
        formato: f['formato'] as FormatoProyeccion, idioma: f['idioma'] as IdiomaFuncion,
        precioBase: Number(f['precio_base']), sala: sala ? { id: String(sala['id']), numero: Number(sala['numero']) } : undefined,
        pelicula: pelicula ? { id: String(pelicula['id']), titulo: String(pelicula['titulo'] ?? ''),
          genero: '', sinopsis: '', duracionMin: Number(pelicula['duracion_min'] ?? 0), imagenUrl: '',
          clasificacion: (pelicula['clasificacion'] as Pelicula['clasificacion']) ?? 'ATP',
          estado: (pelicula['estado'] as Pelicula['estado']) ?? 'EN_CARTELERA',
          preventaActiva: Boolean(pelicula['preventa_activa']) } : undefined,
      };
    });
  }

  async obtenerButacas(funcionId: string): Promise<Butaca[]> {
    const { data: funcion, error: errorFuncion } = await this.auth.client.from('funciones')
      .select('sala_id').eq('id', funcionId).single();
    if (errorFuncion) throw errorFuncion;
    const { data, error } = await this.auth.client.from('butacas').select('*')
      .eq('sala_id', funcion.sala_id).order('fila').order('numero');
    if (error) throw error;
    const { data: compradas, error: errorEntradas } = await this.auth.client.rpc('butacas_ocupadas_funcion', {
      p_funcion_id: funcionId,
    });
    if (errorEntradas) throw errorEntradas;
    const ocupadas = new Set((compradas ?? []).map((id: string) => String(id)));
    return (data ?? []).map((b: Record<string, unknown>) => ({
      id: String(b['id']), salaId: String(b['sala_id']), fila: String(b['fila']),
      numero: Number(b['numero']), tipo: b['tipo'] as Butaca['tipo'], ocupadaEnFuncion: ocupadas.has(String(b['id'])),
    }));
  }

  async obtenerReservasActivas(funcionId: string): Promise<Array<{ butacaId: string; expiraEn: string }>> {
    const { data, error } = await this.auth.client.from('reservas_butacas')
      .select('butaca_id, expira_en').eq('funcion_id', funcionId).gt('expira_en', new Date().toISOString());
    if (error) throw error;
    return (data ?? []).map((r: Record<string, unknown>) => ({
      butacaId: String(r['butaca_id']), expiraEn: String(r['expira_en']),
    }));
  }

  async reservarButaca(funcionId: string, butacaId: string, token: string): Promise<string> {
    const { data, error } = await this.auth.client.rpc('tomar_reserva_butaca', {
      p_funcion_id: funcionId, p_butaca_id: butacaId, p_token: token,
    });
    if (error) throw error;
    return String(data);
  }

  async liberarReservas(token: string, butacaIds?: string[]): Promise<void> {
    const { error } = await this.auth.client.rpc('liberar_reservas_butacas', {
      p_token: token, p_butaca_ids: butacaIds ?? null,
    });
    if (error) throw error;
  }

  canalReservas(funcionId: string, alCambiar: () => void) {
    return this.auth.client.channel(`reservas-funcion-${funcionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas_butacas', filter: `funcion_id=eq.${funcionId}` }, alCambiar)
      .subscribe();
  }

  async crearOrden(funcionId: string, butacaIds: string[], token: string, fechaNacimiento: string | null, asisteAdulto: boolean): Promise<ComprobanteCompra> {
    const { data, error } = await this.auth.client.rpc('comprar_orden_con_comprobante', {
      p_funcion_id: funcionId, p_butaca_ids: butacaIds, p_token: token,
      p_fecha_nacimiento: fechaNacimiento, p_asiste_adulto: asisteAdulto,
    });
    if (error) throw error;
    const row = (data as Record<string, unknown>[] | null)?.[0];
    if (!row) throw new Error('No se recibió el comprobante de la orden. Volvé a intentarlo.');
    return {
      ordenId: String(row['orden_id']), codigoQr: String(row['codigo_qr']), total: Number(row['total']),
      subtotal: Number(row['subtotal'] ?? row['total']), descuento: Number(row['descuento'] ?? 0),
      codigoCupon: row['codigo_cupon'] == null ? null : String(row['codigo_cupon']),
      fechaCompra: String(row['fecha_compra']), estado: String(row['estado']), pelicula: String(row['pelicula']),
      fechaFuncion: String(row['fecha_funcion']), sala: Number(row['sala']), formato: String(row['formato']),
      idioma: String(row['idioma']), butacas: (row['butacas'] as string[] | null) ?? [],
    };
  }
}
