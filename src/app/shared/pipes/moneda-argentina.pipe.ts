import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'monedaArgentina', standalone: true })
export class MonedaArgentinaPipe implements PipeTransform {
  private readonly formato = new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
  });
  transform(valor: number | null | undefined): string {
    return this.formato.format(Number(valor ?? 0));
  }
}
