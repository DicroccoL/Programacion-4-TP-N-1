import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminCuponesComponent } from './admin-cupones.component';
import { SalasFuncionesService } from '../../../core/services/salas-funciones.service';

@Component({
  selector: 'app-admin-configuracion', standalone: true, imports: [FormsModule, AdminCuponesComponent],
  template: `
    <section class="configuracion-admin">
      <header><h3>Configuración</h3><p>Definí el precio general de las entradas. Se aplicará a las nuevas funciones.</p></header>
      @if (cargando()) { <p class="ayuda">Cargando precio guardado…</p> }
      @else if (configuracionCargada()) {
        <form class="precio-form" (ngSubmit)="guardar()">
          <label for="precio-base">Precio base de entrada</label>
          <div class="precio-control"><span>$</span><input id="precio-base" name="precio" type="number" min="1" step="100" required [(ngModel)]="precio" /></div>
          <p class="ayuda">El precio VIP se calcula automáticamente con un adicional del 50%. Al guardar, el precio base se actualiza también en todas las funciones creadas.</p>
          <button type="submit" [disabled]="guardando()">{{ guardando() ? 'Guardando…' : 'Guardar precio' }}</button>
        </form>
      } @else {
        <button type="button" class="recargar" (click)="cargar()">Volver a cargar configuración</button>
      }
      @if (mensaje()) {<p class="aviso exito" role="status">{{ mensaje() }}</p>}
      @if (error()) {<p class="aviso error" role="alert">{{ error() }}</p>}
      <app-admin-cupones />
    </section>
  `,
  styles: [`
    .configuracion-admin{display:grid;gap:1.25rem;color:var(--text-primary);max-width:680px}.configuracion-admin header p{color:var(--text-muted);margin-top:.25rem}.precio-form{display:grid;gap:.75rem;padding:1.25rem;background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:var(--radius-md)}.precio-form>label{font-size:.9rem;font-weight:600}.precio-control{display:flex;align-items:center;gap:.5rem;padding:.65rem .8rem;background:var(--bg-input);border:1px solid var(--border-strong);border-radius:var(--radius-sm);color:var(--text-secondary)}.precio-control input{width:100%;border:0;background:transparent;color:var(--text-primary);outline:0}.ayuda{font-size:.82rem;color:var(--text-muted)}.precio-form button,.recargar{justify-self:start;padding:.75rem 1rem;border:0;border-radius:var(--radius-sm);background:var(--accent-crimson);font-weight:700;cursor:pointer;color:var(--text-primary)}.precio-form button:disabled,.recargar:disabled{opacity:.6}.aviso{padding:.75rem 1rem;border-radius:var(--radius-sm)}.exito{color:#6ee7b7;background:#064e3b55}.error{color:#fda4af;background:#88133755}
  `],
})
/** Administra la configuración global, principalmente el precio base. */
export class AdminConfiguracionComponent implements OnInit {
  private readonly programacion = inject(SalasFuncionesService);
  private readonly formatoMoneda = new CurrencyPipe('es-AR');
  readonly guardando = signal(false); readonly cargando = signal(true);
  readonly configuracionCargada = signal(false); readonly error = signal(''); readonly mensaje = signal('');
  precio = 0;
  async ngOnInit(): Promise<void> {
    await this.cargar();
  }
  async cargar(): Promise<void> {
    this.cargando.set(true); this.error.set('');
    try {
      this.precio = await this.programacion.obtenerPrecioEntradaBase();
      this.configuracionCargada.set(true);
    } catch (e) {
      this.configuracionCargada.set(false);
      this.error.set(`No se pudo cargar el precio de configuración: ${this.detalle(e)}`);
    } finally { this.cargando.set(false); }
  }
  async guardar(): Promise<void> {
    this.error.set(''); this.mensaje.set('');
    if (!Number.isFinite(Number(this.precio)) || Number(this.precio) <= 0) { this.error.set('El precio debe ser mayor que cero.'); return; }
    this.guardando.set(true);
    try {
      await this.programacion.actualizarPrecioEntradaBase(Number(this.precio));
      this.precio = await this.programacion.obtenerPrecioEntradaBase();
      const precioFormateado = this.formatoMoneda.transform(this.precio, 'ARS', 'symbol', '1.0-0');
      this.mensaje.set(`Precio guardado y verificado: ${precioFormateado}. Se actualizó también en todas las funciones existentes.`);
    }
    catch (e) { this.error.set(`No se pudo guardar el precio: ${this.detalle(e)}`); }
    finally { this.guardando.set(false); }
  }
  private detalle(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (error && typeof error === 'object') {
      const data = error as Record<string, unknown>;
      return [data['message'], data['details'], data['code']].filter(Boolean).join(' · ');
    }
    return String(error);
  }
}
