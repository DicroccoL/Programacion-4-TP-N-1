import { Pipe, PipeTransform } from '@angular/core';

/**
 * Presenta importes en pesos argentinos con el formato local (por ejemplo, $ 12.000).
 * Recibe valores numéricos; si el dato está vacío o no es válido, muestra $ 0.
 */
@Pipe({ name: 'monedaArgentina', standalone: true, pure: true })
export class MonedaArgentinaPipe implements PipeTransform {
  /** Se crea una sola vez para reutilizar el formateador en cada transformación. */
  private readonly formateador = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });

  /** Se usa en plantillas como `{{ precio | monedaArgentina }}`. */
  transform(valor: number | null | undefined): string {
    const importe = Number(valor ?? 0);
    return this.formateador.format(Number.isFinite(importe) ? importe : 0);
  }
}
