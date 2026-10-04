import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';

export interface PeliculaVendida {
  id: string; titulo: string; imagenUrl: string; totalVendidas: number;
}

export interface MiPelicula {
  ordenId: string; peliculaId: string; titulo: string; imagenUrl: string;
  fechaFuncion: string; puntajePropio: number | null; fechaCompra: string;
  sala: number; formato: string; idioma: string; butacas: string[];
  total: number; codigoQr: string; qrUsado: boolean;
}

export interface EstadoAlerta { peliculaId: string; notificada: boolean; }
export interface MiAlertaEstreno { alertaId: string; peliculaId: string; titulo: string; fechaEstreno: string | null; disponible: boolean; }
export interface MiComprobante { ordenId:string; codigoQr:string; total:number; fechaCompra:string; entradas:string[]; qrUsado:boolean; }

@Injectable({ providedIn: 'root' })
export class ExperienciaClienteService {
  constructor(private readonly auth: AuthService) {}

  async obtenerMasVendidas(): Promise<PeliculaVendida[]> {
    const { data, error } = await this.auth.client.rpc('obtener_tres_peliculas_mas_vendidas');
    if (error) throw error;
    return (data ?? []).map((row: Record<string, unknown>) => ({
      id: String(row['id']), titulo: String(row['titulo']), imagenUrl: String(row['imagen_url'] ?? ''),
      totalVendidas: Number(row['total_vendidas'] ?? 0),
    }));
  }

  async activarAlerta(peliculaId: string): Promise<void> {
    const userId = this.auth.currentUser()?.id;
    if (!userId) throw new Error('Iniciá sesión para activar una alerta de estreno.');
    const { error } = await this.auth.client.from('alertas_estreno')
      .upsert({ usuario_id: userId, pelicula_id: peliculaId, notificada: false }, { onConflict: 'usuario_id,pelicula_id' });
    if (error) throw error;
  }

  async obtenerAlertasActivas(): Promise<EstadoAlerta[]> {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return [];
    const { data, error } = await this.auth.client.from('alertas_estreno')
      .select('pelicula_id,notificada').eq('usuario_id', userId);
    if (error) throw error;
    return (data ?? []).map((row: Record<string, unknown>) => ({
      peliculaId: String(row['pelicula_id']), notificada: Boolean(row['notificada']),
    }));
  }

  async obtenerMisAlertasEstreno(): Promise<MiAlertaEstreno[]> {
    const { data, error } = await this.auth.client.rpc('obtener_mis_alertas_estreno');
    if (error) throw error;
    return (data ?? []).map((row: Record<string, unknown>) => ({
      alertaId:String(row['alerta_id']), peliculaId:String(row['pelicula_id']), titulo:String(row['titulo']),
      fechaEstreno:row['fecha_estreno'] == null ? null : String(row['fecha_estreno']), disponible:Boolean(row['disponible']),
    }));
  }

  async obtenerMisComprobantes(): Promise<MiComprobante[]> {
    const { data, error } = await this.auth.client.rpc('obtener_mis_codigos_entrada');
    if(error)throw error;
    return (data??[]).map((row:Record<string,unknown>)=>({
      ordenId:String(row['orden_id']),codigoQr:String(row['codigo_qr']),total:Number(row['total']),
      fechaCompra:String(row['fecha_compra']),entradas:(row['entradas'] as string[]|null)??[],qrUsado:Boolean(row['qr_usado']),
    }));
  }

  async obtenerMisPeliculas(): Promise<MiPelicula[]> {
    const { data, error } = await this.auth.client.rpc('obtener_mis_funciones_historial');
    if (error) throw error;
    return (data ?? []).map((row: Record<string, unknown>) => ({
      ordenId: String(row['orden_id']), peliculaId: String(row['pelicula_id']), titulo: String(row['titulo']),
      imagenUrl: String(row['imagen_url'] ?? ''), fechaFuncion: String(row['fecha_funcion']),
      puntajePropio: row['puntaje_propio'] == null ? null : Number(row['puntaje_propio']), fechaCompra: String(row['fecha_compra']),
      sala: Number(row['sala']), formato: String(row['formato']), idioma: String(row['idioma']),
      butacas: (row['butacas'] as string[] | null) ?? [], total: Number(row['total']),
      codigoQr: String(row['codigo_qr']), qrUsado: Boolean(row['qr_usado']),
    }));
  }

  async cancelarMiOrden(ordenId: string): Promise<number> {
    const { data, error } = await this.auth.client.rpc('cancelar_mi_orden', { p_orden_id: ordenId });
    if (error) throw error;
    return Number(data ?? 0);
  }
}
