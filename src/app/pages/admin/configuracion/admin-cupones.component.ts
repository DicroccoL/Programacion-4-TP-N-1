import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CuponDescuento, CuponesService } from '../../../core/services/cupones.service';

@Component({
  selector: 'app-admin-cupones', standalone: true, imports: [FormsModule],
  template: `
    <section><h3>Descuentos y cupones</h3>
      <form (ngSubmit)="guardarPrimeraCompra()">
        <label>Descuento de primera compra (%)<input name="primera" type="number" min="0" max="100" step="0.01" required [(ngModel)]="primeraCompra"></label>
        <p>Se aplica automáticamente una vez por cuenta. El valor 0 desactiva el beneficio.</p>
        <button [disabled]="ocupado() || !listo()">Guardar porcentaje</button>
      </form>
      <form (ngSubmit)="guardarCupon()">
        <h4>{{ formulario.id ? 'Editar cupón' : 'Crear cupón' }}</h4>
        <label>Código<input name="codigo" maxlength="30" required [(ngModel)]="formulario.codigo"></label>
        <label>Descuento (%)<input name="porcentaje" type="number" min="0.01" max="100" step="0.01" required [(ngModel)]="formulario.porcentaje"></label>
        <label><input name="mayores" type="checkbox" [(ngModel)]="formulario.soloMayores50"> Solo usuarios mayores de 50 años</label>
        <label><input name="activo" type="checkbox" [(ngModel)]="formulario.activo"> Cupón activo</label>
        <button [disabled]="ocupado() || !listo()">Guardar cupón</button>
        @if (formulario.id) { <button type="button" (click)="nuevo()">Cancelar edición</button> }
      </form>
      <p>Se aplica un solo descuento por compra: el mayor entre primera compra y cupón válido. La edad se comprueba con la fecha de nacimiento del perfil.</p>
      @for (cupon of cupones(); track cupon.id) {
        <article><strong>{{ cupon.codigo }} · {{ cupon.porcentaje }}%</strong>
          <span>{{ cupon.soloMayores50 ? 'Mayores de 50' : 'Todos los usuarios registrados' }} · {{ cupon.activo ? 'Activo' : 'Inactivo' }}</span>
          <button type="button" [disabled]="ocupado()" (click)="editar(cupon)">Editar</button>
        </article>
      }
      @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
      @if (mensaje()) { <p class="ok" role="status">{{ mensaje() }}</p> }
    </section>`,
  styles: [`section{display:grid;gap:1rem;color:var(--text-primary)}form{display:grid;gap:.75rem;padding:1.25rem;border:1px solid var(--border-subtle);border-radius:var(--radius-md);background:var(--bg-surface)}label{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap}input:not([type=checkbox]){padding:.65rem;background:var(--bg-input);color:var(--text-primary);border:1px solid var(--border-strong);border-radius:var(--radius-sm)}button{padding:.6rem .8rem;justify-self:start;background:var(--accent-crimson);color:white;border:0;border-radius:var(--radius-sm);cursor:pointer}button:disabled{opacity:.5}article{display:flex;gap:1rem;align-items:center;flex-wrap:wrap;padding:.75rem;border-bottom:1px solid var(--border-subtle)}p,span{color:var(--text-secondary)}.error{color:#fda4af}.ok{color:#6ee7b7}`],
})
export class AdminCuponesComponent implements OnInit {
  private readonly servicio = inject(CuponesService);
  readonly cupones = signal<CuponDescuento[]>([]);
  readonly ocupado = signal(false);
  readonly listo = signal(false);
  readonly error = signal('');
  readonly mensaje = signal('');
  primeraCompra = 20;
  formulario: CuponDescuento = this.vacio();
  async ngOnInit(): Promise<void> {
    try {
      const [porcentaje, cupones] = await Promise.all([this.servicio.obtenerPorcentajePrimeraCompra(), this.servicio.listar()]);
      this.primeraCompra = porcentaje; this.cupones.set(cupones); this.listo.set(true);
    } catch { this.error.set('No se pudo cargar la configuración de descuentos. Revisá que la migración de cupones esté instalada.'); }
  }
  async guardarPrimeraCompra(): Promise<void> {
    if (this.primeraCompra == null) { this.error.set('Ingresá el porcentaje; usá 0 si querés desactivar el beneficio.'); return; }
    await this.operar(async () => { await this.servicio.guardarPorcentajePrimeraCompra(Number(this.primeraCompra)); });
  }
  async guardarCupon(): Promise<void> {
    await this.operar(async () => {
      await this.servicio.guardar({ ...this.formulario, porcentaje: Number(this.formulario.porcentaje) });
      this.cupones.set(await this.servicio.listar()); this.nuevo();
    });
  }
  editar(cupon: CuponDescuento): void { this.formulario = { ...cupon }; }
  nuevo(): void { this.formulario = this.vacio(); }
  private vacio(): CuponDescuento { return { codigo: '', porcentaje: 10, soloMayores50: true, activo: true }; }
  private async operar(fn: () => Promise<void>): Promise<void> {
    if (this.ocupado() || !this.listo()) return;
    this.ocupado.set(true); this.error.set(''); this.mensaje.set('');
    try { await fn(); this.mensaje.set('Configuración guardada.'); }
    catch (error) { this.error.set((error as { message?: string })?.message ?? 'No se pudo guardar.'); }
    finally { this.ocupado.set(false); }
  }
}
