import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ReportesService } from '../../../core/services/reportes.service';
import {
  Actividad,
  PeliculaVendida,
  ProductoVendido,
  VentaDia,
} from '../../../models/reportes.model';
import { FechaArgentinaPipe } from '../../../shared/pipes/fecha-argentina.pipe';

/** Maneja los filtros, el estado y las acciones de la pantalla de reportes. */
@Component({
  selector: 'app-admin-reportes',
  standalone: true,
  imports: [FechaArgentinaPipe],
  templateUrl: './admin-reportes.component.html',
  styleUrl: './admin-reportes.component.css',
})
export class AdminReportesComponent implements OnInit {
  private readonly formatoMoneda = new CurrencyPipe('es-AR');
  private readonly reportes = inject(ReportesService);
  private readonly formatoFecha = new FechaArgentinaPipe();
  private readonly hoy = new Date();

  // El período inicial abarca hoy y los 29 días anteriores.
  private desde = new Date(this.hoy.getTime() - 29 * 86400000).toISOString().slice(0, 10);
  private hasta = this.hoy.toISOString().slice(0, 10);

  // Datos que utiliza el HTML para presentar tablas, barras y actividad.
  readonly ventas = signal<VentaDia[]>([]);
  readonly peliculas = signal<PeliculaVendida[]>([]);
  readonly productos = signal<ProductoVendido[]>([]);
  readonly actividades = signal<Actividad[]>([]);

  // Mensaje de error que muestra la pantalla si la consulta falla.
  readonly error = signal('');

  /** Carga los datos cuando Angular crea la pantalla. */
  ngOnInit(): void {
    void this.cargar();
  }

  /** Calcula el rango de hoy, siete o treinta días sin ingresar fechas manuales. */
  periodo(dias: 1 | 7 | 30): void {
    const hoy = new Date();
    this.hasta = hoy.toISOString().slice(0, 10);
    this.desde = new Date(hoy.getTime() - (dias - 1) * 86400000).toISOString().slice(0, 10);
    void this.cargar();
  }

  /** Pide los datos del período calculado y actualiza las señales. */
  async cargar(): Promise<void> {
    this.error.set('');
    try {
      const datos = await this.reportes.obtenerReportes(this.desde, this.hasta);
      this.ventas.set(datos.ventas);
      this.peliculas.set(datos.peliculas);
      this.productos.set(datos.productos);
      this.actividades.set(datos.actividades);
    } catch (error) {
      this.error.set(
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar los reportes.',
      );
    }
  }

  /** Entrega al servicio las ventas visibles para descargar su resumen. */
  exportarCsv(): void {
    this.reportes.exportarVentasCsv(this.ventas(), this.desde, this.hasta);
  }

  /** Abre la impresión del navegador, donde se puede elegir Guardar como PDF. */
  imprimir(): void {
    window.print();
  }

  /** Obtiene los máximos para dibujar las barras en proporción a las ventas. */
  maxPelicula(): number {
    return Math.max(1, ...this.peliculas().map((pelicula) => pelicula.entradas_vendidas));
  }

  maxCandy(): number {
    return Math.max(1, ...this.productos().map((producto) => producto.cantidad_vendida));
  }

  /** Convierte una cantidad a porcentaje; deja un ancho mínimo visible de 3%. */
  ancho(valor: number, maximo: number): number {
    return Math.max(3, (valor / maximo) * 100);
  }

  /** Presenta importes en pesos argentinos, sin decimales. */
  moneda(valor: number): string {
    return this.formatoMoneda.transform(valor, 'ARS', 'symbol', '1.0-0') ?? '$ 0';
  }

  /** Reutiliza el pipe para mostrar fecha y hora de la actividad. */
  fecha(valor: string): string {
    return this.formatoFecha.transform(valor, true);
  }
}
