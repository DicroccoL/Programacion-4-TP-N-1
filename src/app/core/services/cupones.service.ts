import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';

export interface CuponDescuento {
  id?: string;
  codigo: string;
  porcentaje: number;
  soloMayores50: boolean;
  activo: boolean;
}

/** Administra promociones; la RPC de compra valida elegibilidad y calcula el importe. */
@Injectable({ providedIn: 'root' })
export class CuponesService {
  private readonly auth = inject(AuthService);

  async obtenerPorcentajePrimeraCompra(): Promise<number> {
    const { data, error } = await this.auth.client.from('configuracion_descuentos')
      .select('porcentaje_primera_compra').eq('id', true).single();
    if (error) throw error;
    return Number(data.porcentaje_primera_compra);
  }

  async guardarPorcentajePrimeraCompra(porcentaje: number): Promise<void> {
    this.validarPorcentaje(porcentaje, true);
    const { error } = await this.auth.client.from('configuracion_descuentos')
      .update({ porcentaje_primera_compra: porcentaje }).eq('id', true);
    if (error) throw error;
    const guardado = await this.obtenerPorcentajePrimeraCompra();
    if (guardado !== porcentaje) throw new Error('No se confirmó el cambio del descuento.');
  }

  async listar(): Promise<CuponDescuento[]> {
    const { data, error } = await this.auth.client.from('cupones_descuento').select('*').order('codigo');
    if (error) throw error;
    return (data ?? []).map(row => ({ id: row.id, codigo: row.codigo,
      porcentaje: Number(row.porcentaje), soloMayores50: row.solo_mayores_50, activo: row.activo }));
  }

  async guardar(cupon: CuponDescuento): Promise<void> {
    const codigo = cupon.codigo.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,30}$/.test(codigo)) throw new Error('El código debe tener entre 3 y 30 letras, números, guiones o guiones bajos.');
    if (codigo === 'PRIMERA_COMPRA') throw new Error('Ese código está reservado para el beneficio de primera compra.');
    this.validarPorcentaje(cupon.porcentaje);
    const valores = { codigo, porcentaje: cupon.porcentaje,
      solo_mayores_50: cupon.soloMayores50, activo: cupon.activo,
    };
    const tabla = this.auth.client.from('cupones_descuento');
    const operacion = cupon.id ? tabla.update(valores).eq('id', cupon.id) : tabla.insert(valores);
    const { error } = await operacion.select('id').single();
    if (error) throw error;
  }

  private validarPorcentaje(valor: number, permitirCero = false): void {
    if (!Number.isFinite(valor) || valor < (permitirCero ? 0 : 0.01) || valor > 100) {
      throw new Error('Ingresá un porcentaje válido entre ' + (permitirCero ? '0' : '0,01') + ' y 100.');
    }
    if (Math.abs(valor * 100 - Math.round(valor * 100)) > 0.000001) {
      throw new Error('El porcentaje puede tener hasta dos decimales.');
    }
  }
}
