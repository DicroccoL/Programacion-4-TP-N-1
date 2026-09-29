import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'fechaArgentina',
  standalone: true,
})
export class FechaArgentinaPipe implements PipeTransform {
  transform(valor: string | Date | null | undefined, incluirHora = false): string {
    if (!valor) return '';

    if (typeof valor === 'string') {
      const fechaSolo = valor.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (fechaSolo) {
        const [, anio, mes, dia] = fechaSolo;
        const fechaUtc = new Date(Date.UTC(Number(anio), Number(mes) - 1, Number(dia)));
        if (
          fechaUtc.getUTCFullYear() !== Number(anio) ||
          fechaUtc.getUTCMonth() + 1 !== Number(mes) ||
          fechaUtc.getUTCDate() !== Number(dia)
        ) {
          return '';
        }
        return `${dia}/${mes}/${anio}`;
      }
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
    const obtenerParte = (tipo: Intl.DateTimeFormatPartTypes) =>
      partes.find((parte) => parte.type === tipo)?.value ?? '';
    const fechaFormateada = `${obtenerParte('day')}/${obtenerParte('month')}/${obtenerParte('year')}`;

    return incluirHora
      ? `${fechaFormateada} ${obtenerParte('hour')}:${obtenerParte('minute')}`
      : fechaFormateada;
  }
}
