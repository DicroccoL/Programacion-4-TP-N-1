import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { ReportesAdmin, VentaDia } from '../../models/reportes.model';

/** Consulta los reportes y descarga el resumen de ventas.
 * AdminReportesComponent lo utiliza; los cálculos y permisos siguen en Supabase.
 */
@Injectable({ providedIn: 'root' })
export class ReportesService {
  private readonly auth = inject(AuthService);

  /** Recibe el período y devuelve los cuatro conjuntos de datos de la pantalla. */
  async obtenerReportes(desde: string, hasta: string): Promise<ReportesAdmin> {
    const rango = { p_desde: desde, p_hasta: hasta };

    // Las consultas son independientes: Promise.all permite hacerlas en paralelo.
    // La actividad reciente no recibe el filtro de fechas.
    const [ventas, peliculas, productos, actividades] = await Promise.all([
      this.auth.client.rpc('obtener_reporte_ventas_diarias', rango),
      this.auth.client.rpc('obtener_reporte_peliculas_vendidas', rango),
      this.auth.client.rpc('obtener_reporte_candy_vendido', rango),
      this.auth.client.rpc('obtener_log_actividad_admin'),
    ]);

    // Supabase devuelve error como parte de la respuesta; lo propagamos a la pantalla.
    const resultados = [ventas, peliculas, productos, actividades];
    const fallido = resultados.find((resultado) => resultado.error);
    if (fallido?.error) throw fallido.error;

    return {
      ventas: ventas.data ?? [],
      peliculas: peliculas.data ?? [],
      productos: productos.data ?? [],
      actividades: actividades.data ?? [],
    };
  }

  /** Descarga las ventas diarias como CSV, que puede abrirse con Excel. */
  exportarVentasCsv(ventas: VentaDia[], desde: string, hasta: string): void {
    const filas = [
      ['Día', 'Facturación', 'Entradas vendidas'],
      ...ventas.map((venta) => [
        venta.dia,
        String(venta.facturacion),
        String(venta.entradas_vendidas),
      ]),
    ];

    // Escapamos las comillas y usamos punto y coma para separar las columnas.
    const contenido = filas
      .map((fila) => fila.map((valor) => '"' + valor.replaceAll('"', '""') + '"').join(';'))
      .join('\r\n');

    // El BOM ayuda a Excel a interpretar correctamente los acentos del archivo.
    const archivo = new Blob(['\uFEFF' + contenido], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `reporte-ventas-${desde}-${hasta}.csv`;
    enlace.click();

    // Liberamos la URL temporal después de iniciar la descarga.
    URL.revokeObjectURL(url);
  }
}
