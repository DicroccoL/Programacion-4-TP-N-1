import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { FormatoProyeccion, Funcion, IdiomaFuncion, Sala } from '../../models/cine.model';
import { Pelicula } from '../../models/pelicula.model';

/** Datos necesarios para crear una sala y generar sus butacas. */
export interface CrearSalaDTO {
  numero: number;
  formatos: FormatoProyeccion[];
  idiomas: IdiomaFuncion[];
}

/** Datos necesarios para programar una función. */
export interface CrearFuncionDTO {
  peliculaId: string;
  fechaHoraInicio: string;
  formato: FormatoProyeccion;
  idioma: IdiomaFuncion;
  precioBase: number;
}

/**
 * Gestiona la programación del cine: salas, funciones y precio base.
 *
 * Centraliza las consultas a Supabase relacionadas con la planificación de
 * funciones. La asignación automática de sala y otras reglas se ejecutan en
 * las RPC de la base de datos.
 *
 * Se usa desde el detalle de película y las pantallas administrativas de
 * salas, funciones y configuración.
 */
@Injectable({ providedIn: 'root' })
export class ProgramacionService {
  constructor(private readonly auth: AuthService) {}

  /** Lista las salas ordenadas por número y adapta sus datos al modelo Sala. */
  async listarSalas(): Promise<Sala[]> {
    const { data, error } = await this.auth.client
      .from('salas')
      .select('*')
      .order('numero');
    if (error) throw error;

    return (data ?? []).map((s: Record<string, unknown>) => ({
      id: String(s['id']),
      numero: Number(s['numero']),
      formatos: (s['formatos'] as FormatoProyeccion[] | null) ?? ['2D'],
      idiomas: (s['idiomas'] as IdiomaFuncion[] | null) ?? ['CASTELLANO'],
    }));
  }

  /** Crea una sala y sus butacas mediante una única RPC de Supabase. */
  async crearSala(dto: CrearSalaDTO): Promise<void> {
    const { error } = await this.auth.client.rpc('crear_sala_con_butacas', {
      p_numero: dto.numero,
      p_formatos: dto.formatos,
      p_idiomas: dto.idiomas,
    });
    if (error) throw error;
  }

  /**
   * Elimina atómicamente una sala sin funciones y las butacas que contiene.
   * La RPC comprueba el rol administrador y las referencias antes de borrar.
   */
  async eliminarSala(salaId: string): Promise<void> {
    const { data, error } = await this.auth.client.rpc('eliminar_sala_sin_funciones', {
      p_sala_id: salaId,
    });
    if (error) throw error;
    if (data !== true) {
      throw new Error(
        'Supabase no confirmó la eliminación de la sala.',
      );
    }
  }

  /** Obtiene el precio global configurado y comprueba que sea válido. */
  async obtenerPrecioEntradaBase(): Promise<number> {
    const { data, error } = await this.auth.client.rpc('obtener_precio_entrada_base');
    if (error) throw error;

    const precio = Number(data);
    if (!Number.isFinite(precio) || precio <= 0) {
      throw new Error(
        'Configurá un precio base válido en Configuración antes de programar funciones.',
      );
    }
    return precio;
  }

  /** Actualiza en Supabase el precio global de las entradas. */
  async actualizarPrecioEntradaBase(precio: number): Promise<void> {
    const { error } = await this.auth.client.rpc('actualizar_precio_entrada_base', {
      p_valor: precio,
    });
    if (error) throw error;
  }

  /**
   * Programa una función y deja que Supabase asigne una sala compatible.
   * Convierte la fecha recibida a formato ISO antes de enviarla a la RPC.
   */
  async crearFuncion(dto: CrearFuncionDTO): Promise<void> {
    const { error } = await this.auth.client.rpc('crear_funcion_con_sala_automatica', {
      p_pelicula_id: dto.peliculaId,
      p_fecha_hora_inicio: new Date(dto.fechaHoraInicio).toISOString(),
      p_formato: dto.formato,
      p_idioma: dto.idioma,
      p_precio_base: dto.precioBase,
    });
    if (error) throw error;
  }

  /** Elimina una función mediante la operación definida en Supabase. */
  async eliminarFuncion(funcionId: string): Promise<void> {
    const { error } = await this.auth.client.rpc('eliminar_funcion', {
      p_funcion_id: funcionId,
    });
    if (error) throw error;
  }

  /**
   * Lista las funciones futuras, opcionalmente filtradas por película.
   * Adapta las relaciones anidadas de Supabase al modelo Funcion.
   */
  async listarFunciones(peliculaId?: string): Promise<Funcion[]> {
    let query = this.auth.client
      .from('funciones')
      .select(
        '*, salas(id, numero), peliculas(id, titulo, duracion_min, imagen_url, clasificacion, estado, preventa_activa)',
      )
      .gte('fecha_hora_inicio', new Date().toISOString())
      .order('fecha_hora_inicio');
    if (peliculaId) query = query.eq('pelicula_id', peliculaId);

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? []).map((f: Record<string, unknown>) => {
      const sala = f['salas'] as Record<string, unknown> | null;
      const pelicula = f['peliculas'] as Record<string, unknown> | null;
      return {
        id: String(f['id']),
        peliculaId: String(f['pelicula_id']),
        salaId: String(f['sala_id']),
        fechaHoraInicio: String(f['fecha_hora_inicio']),
        fechaHoraFin: String(f['fecha_hora_fin']),
        formato: f['formato'] as FormatoProyeccion,
        idioma: f['idioma'] as IdiomaFuncion,
        precioBase: Number(f['precio_base']),
        sala: sala ? { id: String(sala['id']), numero: Number(sala['numero']) } : undefined,
        pelicula: pelicula
          ? {
              id: String(pelicula['id']),
              titulo: String(pelicula['titulo'] ?? ''),
              genero: '',
              sinopsis: '',
              duracionMin: Number(pelicula['duracion_min'] ?? 0),
              imagenUrl: '',
              clasificacion: (pelicula['clasificacion'] as Pelicula['clasificacion']) ?? 'ATP',
              estado: (pelicula['estado'] as Pelicula['estado']) ?? 'EN_CARTELERA',
              preventaActiva: Boolean(pelicula['preventa_activa']),
            }
          : undefined,
      };
    });
  }
}
