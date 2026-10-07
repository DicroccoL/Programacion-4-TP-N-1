import { Pipe, PipeTransform } from '@angular/core';

/**
 * Muestra fechas con el formato habitual argentino (dd/MM/aaaa).
 * Las fechas con hora se convierten a la zona horaria de Buenos Aires.
 * Una fecha inválida o vacía se representa como texto vacío.
 */
@Pipe({
  name: 'fechaArgentina',
  standalone: true,
  pure: true,
})
export class FechaArgentinaPipe implements PipeTransform {
  /**
   * Puede recibir una fecha ISO (`2026-10-07`), una fecha con hora o un Date.
   * Con `incluirHora = true`, agrega la hora local en formato de 24 horas.
   */
  transform(valor: string | Date | null | undefined, incluirHora = false): string {
    if (!valor) return '';

    if (typeof valor === 'string') {
      const fechaSinHora = this.formatearFechaSinHora(valor);
      if (fechaSinHora !== null) return fechaSinHora;
    }

    const fecha = valor instanceof Date ? valor : new Date(valor);
    if (Number.isNaN(fecha.getTime())) return '';

    const opciones: Intl.DateTimeFormatOptions = {
      timeZone: 'America/Argentina/Buenos_Aires',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    };
    if (incluirHora) {
      opciones.hour = '2-digit';
      opciones.minute = '2-digit';
      opciones.hourCycle = 'h23';
    }

    const partes = new Intl.DateTimeFormat('es-AR', opciones).formatToParts(fecha);
    const dia = this.obtenerParte(partes, 'day');
    const mes = this.obtenerParte(partes, 'month');
    const anio = this.obtenerParte(partes, 'year');
    const fechaFormateada = `${dia}/${mes}/${anio}`;

    return incluirHora
      ? `${fechaFormateada} ${this.obtenerParte(partes, 'hour')}:${this.obtenerParte(partes, 'minute')}`
      : fechaFormateada;
  }

  /** Mantiene el día de calendario de un ISO date sin convertirlo de zona horaria. */
  private formatearFechaSinHora(valor: string): string | null {
    const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
    if (!coincidencia) return null;

    const [, anio, mes, dia] = coincidencia;
    const numeroAnio = Number(anio);
    const numeroMes = Number(mes);
    const numeroDia = Number(dia);
    const diasDelMes = this.diasDelMes(numeroAnio, numeroMes);

    if (diasDelMes === 0 || numeroDia < 1 || numeroDia > diasDelMes) return '';
    return `${dia}/${mes}/${anio}`;
  }

  private diasDelMes(anio: number, mes: number): number {
    const dias = [31, this.esBisiesto(anio) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return dias[mes - 1] ?? 0;
  }

  private esBisiesto(anio: number): boolean {
    return anio % 4 === 0 && (anio % 100 !== 0 || anio % 400 === 0);
  }

  private obtenerParte(
    partes: Intl.DateTimeFormatPart[],
    tipo: Intl.DateTimeFormatPartTypes,
  ): string {
    return partes.find(parte => parte.type === tipo)?.value ?? '';
  }
}
