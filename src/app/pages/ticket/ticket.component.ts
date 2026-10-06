import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { ComprobanteCompra } from '../../core/services/compras.service';
import { MonedaArgentinaPipe } from '../../shared/pipes/moneda-argentina.pipe';
import { FechaArgentinaPipe } from '../../shared/pipes/fecha-argentina.pipe';

@Component({
  selector: 'app-ticket',
  standalone: true,
  imports: [RouterLink, MonedaArgentinaPipe],
  template: `
    <main class="ticket-page">
      <a routerLink="/" class="volver">← Volver a cartelera</a>
      @if (cargando()) {
        <p class="estado">Preparando tu ticket…</p>
      } @else if (error()) {
        <section class="ticket-card"><h1>No se pudo abrir el ticket</h1><p class="aviso">{{ error() }}</p><a routerLink="/">Volver a cartelera</a></section>
      } @else if (ticket(); as t) {
        <section class="ticket-card" aria-labelledby="titulo-ticket">
          <span class="eyebrow">WILDECINEMAS · COMPROBANTE</span>
          <h1 id="titulo-ticket">Tu ticket</h1>
          <p class="estado-confirmado">Compra confirmada</p>
          <div class="datos">
            <div><span>Película</span><strong>{{ t.pelicula }}</strong></div>
            <div><span>Función</span><strong>{{ fecha(t.fechaFuncion) }}</strong></div>
            <div><span>Sala</span><strong>{{ t.sala }} · {{ t.formato }} · {{ t.idioma === 'CASTELLANO' ? 'Castellano' : 'Subtitulada' }}</strong></div>
            <div><span>Butacas</span><strong>{{ t.butacas.join(', ') }}</strong></div>
            <div><span>N.º de orden</span><strong>{{ t.ordenId }}</strong></div>
            <div><span>Subtotal</span><strong>{{ (t.subtotal ?? t.total) | monedaArgentina }}</strong></div>
            @if ((t.descuento ?? 0) > 0 && t.codigoCupon) {
              <div class="descuento"><span>Cupón {{ t.codigoCupon }} · {{ porcentaje(t) }}% OFF</span><strong>−{{ t.descuento | monedaArgentina }}</strong></div>
            }
            <div class="total"><span>Total</span><strong>{{ t.total | monedaArgentina }}</strong></div>
          </div>
          @if (qr()) { <img class="qr" [src]="qr()" alt="QR de identificación de la orden"> }
          <p class="nota">Tu orden quedó registrada y las butacas ya están ocupadas. El QR de este ticket está listo para validar en el cine. El sitio todavía no procesa pagos en línea.</p>
          <button type="button" class="descargar" [disabled]="!qr()" (click)="descargarPdf()">Descargar ticket en PDF</button>
        </section>
      }
    </main>
  `,
  styleUrl: './ticket.component.css',
})
/**
 * Muestra el comprobante recibido luego de confirmar una compra.
 * Supabase genera el identificador `codigo_qr`; este componente lo convierte
 * en imagen y arma el PDF localmente con jsPDF.
 */
export class TicketComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly formatoFecha = new FechaArgentinaPipe();
  readonly ticket = signal<ComprobanteCompra | null>(null);
  readonly qr = signal('');
  readonly cargando = signal(true);
  readonly error = signal('');

  /** Recupera el comprobante desde la navegación o sessionStorage y genera el QR visual. */
  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    const state = (history.state ?? {}) as { comprobante?: ComprobanteCompra };
    let compra = state.comprobante;
    if (!compra || compra.ordenId !== id) {
      try {
        const guardado = id ? sessionStorage.getItem(`ticket:${id}`) : null;
        compra = guardado ? JSON.parse(guardado) as ComprobanteCompra : undefined;
      } catch { compra = undefined; }
    }
    if (!compra || compra.ordenId !== id) {
      this.error.set('No encontramos los datos de esta orden en esta sesión. Volvé a seleccionar las butacas para generar un ticket.');
      this.cargando.set(false);
      return;
    }
    this.ticket.set(compra);
    try {
      this.qr.set(await QRCode.toDataURL(compra.codigoQr, { errorCorrectionLevel: 'H', margin: 2, width: 280 }));
    } catch {
      this.error.set('No se pudo generar el código QR del ticket.');
    } finally {
      this.cargando.set(false);
    }
  }

  fecha(value: string): string {
    return this.formatoFecha.transform(value, true);
  }

  /** Crea y descarga un PDF A5 con los datos de la orden y el QR. */
  descargarPdf(): void {
    const t = this.ticket();
    const qr = this.qr();
    if (!t || !qr) return;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
    const x = 16;
    let y = 20;
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(20); pdf.text('WILDECINEMAS', x, y);
    y += 10; pdf.setFontSize(15); pdf.text('Ticket de función', x, y);
    y += 8; pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10);
    pdf.text('Estado: COMPRA CONFIRMADA', x, y); y += 7;
    pdf.text(pdf.splitTextToSize(`Película: ${t.pelicula}`, 116), x, y); y += 8;
    pdf.text(`Función: ${this.fecha(t.fechaFuncion)}`, x, y); y += 7;
    pdf.text(`Sala ${t.sala} · ${t.formato} · ${t.idioma === 'CASTELLANO' ? 'Castellano' : 'Subtitulada'}`, x, y); y += 7;
    pdf.text(pdf.splitTextToSize(`Butacas: ${t.butacas.join(', ')}`, 116), x, y); y += 8;
    pdf.text(`Orden: ${t.ordenId}`, x, y); y += 8;
    pdf.text(`Subtotal: ${this.moneda(t.subtotal ?? t.total)}`, x, y); y += 7;
    if ((t.descuento ?? 0) > 0 && t.codigoCupon) {
      pdf.text(`Cupón ${t.codigoCupon} (${this.porcentaje(t)}% OFF): -${this.moneda(t.descuento ?? 0)}`, x, y); y += 7;
    }
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13); pdf.text(`Total: ${this.moneda(t.total)}`, x, y); y += 9;
    pdf.addImage(qr, 'PNG', 49, y, 50, 50); y += 55;
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8);
    pdf.text(pdf.splitTextToSize('Compra confirmada. El QR está listo para validar en el cine. Este sitio no procesa pagos en línea.', 116), x, y);
    pdf.save(`ticket-${t.ordenId.slice(0, 8)}.pdf`);
  }

  porcentaje(ticket: ComprobanteCompra): number {
    return ticket.porcentajeDescuento || Math.round(((ticket.descuento ?? 0) / (ticket.subtotal || ticket.total || 1)) * 10000) / 100;
  }

  private moneda(value: number): string {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);
  }
}
