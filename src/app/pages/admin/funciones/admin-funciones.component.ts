import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PeliculasService } from '../../../core/services/peliculas.service';
import { SalasFuncionesService } from '../../../core/services/salas-funciones.service';
import { Pelicula } from '../../../models/pelicula.model';
import { FormatoProyeccion, Funcion, IdiomaFuncion } from '../../../models/cine.model';
import { FechaArgentinaPipe } from '../../../shared/pipes/fecha-argentina.pipe';
import { MonedaArgentinaPipe } from '../../../shared/pipes/moneda-argentina.pipe';

@Component({
  selector: 'app-admin-funciones', standalone: true, imports: [FormsModule, FechaArgentinaPipe, MonedaArgentinaPipe],
  template: `
    <section class="programacion-admin">
      <div><h3>Programar función</h3><p>La sala compatible se asigna automáticamente según formato, idioma y disponibilidad.</p></div>
      <form class="form-programacion" (ngSubmit)="crear()">
        <label>Película<select name="pelicula" required [(ngModel)]="peliculaId"><option value="" disabled>Elegí una película</option>@for (p of peliculas(); track p.id) {<option [value]="p.id">{{ p.titulo }} · {{ p.duracionMin }} min</option>}</select></label>
        <label>Fecha y hora<input name="inicio" type="datetime-local" required [min]="minInicio" [(ngModel)]="inicio" /></label>
        <label>Formato<select name="formato" [(ngModel)]="formato">@for (f of formatos; track f) {<option [value]="f">{{ f }}</option>}</select></label>
        <label>Idioma<select name="idioma" [(ngModel)]="idioma"><option value="CASTELLANO">Castellano</option><option value="SUBTITULADA">Subtitulada</option></select></label>
        <button class="accion-principal" type="submit" [disabled]="guardando()">{{ guardando() ? 'Buscando sala…' : 'Crear función' }}</button>
      </form>
      @if (mensaje()) {<p class="aviso exito" role="status">{{ mensaje() }}</p>}
      @if (error()) {<p class="aviso error" role="alert">{{ error() }}</p>}
      <div class="lista-funciones"><h4>Próximas funciones</h4>
        @if (!funciones().length) {<p class="vacio">Todavía no hay funciones programadas.</p>}
        @for (f of funciones(); track f.id) {<article><strong>{{ titulo(f.peliculaId) }}</strong><span>{{ f.fechaHoraInicio | fechaArgentina: true }}</span><span>Sala {{ f.sala?.numero ?? '—' }}</span><span>{{ f.formato }} · {{ f.idioma === 'CASTELLANO' ? 'Castellano' : 'Subtitulada' }}</span><span>{{ f.precioBase | monedaArgentina }}</span><button class="btn-eliminar" type="button" [disabled]="eliminando() === f.id" (click)="eliminar(f)">{{ eliminando() === f.id ? 'Eliminando…' : 'Eliminar' }}</button></article>}
      </div>
    </section>
  `,
  styles: [`
    .programacion-admin{display:grid;gap:1.25rem;color:var(--text-primary)}.programacion-admin p,.vacio{color:var(--text-muted);margin-top:.25rem}.form-programacion{display:grid;grid-template-columns:repeat(auto-fit,minmax(185px,1fr));gap:1rem;align-items:end;padding:1.25rem;background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:var(--radius-md)}.form-programacion label{display:grid;gap:.4rem;color:var(--text-secondary);font-size:.85rem}.form-programacion input,.form-programacion select{width:100%;padding:.7rem;background:var(--bg-input);border:1px solid var(--border-strong);border-radius:var(--radius-sm)}.accion-principal{padding:.75rem 1rem;border:0;border-radius:var(--radius-sm);background:var(--accent-crimson);font-weight:700;cursor:pointer}.accion-principal:disabled{opacity:.6}.lista-funciones{display:grid;gap:.65rem}.lista-funciones article{display:flex;gap:1rem;flex-wrap:wrap;align-items:center;padding:.9rem 1rem;background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:var(--radius-sm)}.lista-funciones span{color:var(--text-secondary)}.btn-eliminar{margin-left:auto;padding:.5rem .75rem;border:1px solid #fb7185;border-radius:var(--radius-sm);background:transparent;color:#fda4af;cursor:pointer}.btn-eliminar:disabled{opacity:.6}.aviso{padding:.75rem 1rem;border-radius:var(--radius-sm)}.exito{color:#6ee7b7;background:#064e3b55}.error{color:#fda4af;background:#88133755}
  `],
})
/** Crea, lista y elimina funciones futuras; la sala compatible la asigna Supabase. */
export class AdminFuncionesComponent implements OnInit {
  private readonly peliculasService = inject(PeliculasService); private readonly programacion = inject(SalasFuncionesService);
  readonly peliculas = signal<Pelicula[]>([]); readonly funciones = signal<Funcion[]>([]);
  readonly formatos: FormatoProyeccion[] = ['2D','3D'];
  readonly guardando = signal(false); readonly error = signal(''); readonly mensaje = signal('');
  readonly eliminando = signal<string | null>(null);
  peliculaId = ''; formato: FormatoProyeccion = '2D'; idioma: IdiomaFuncion = 'CASTELLANO';
  minInicio = this.fechaMinuto(new Date(Date.now() + 60_000));
  inicio = this.fechaMinuto(new Date(Date.now() + 60 * 60 * 1000));
  async ngOnInit(): Promise<void> {
    try { this.peliculas.set(await this.peliculasService.obtenerTodas()); await this.cargarFunciones(); }
    catch (e) { this.error.set(`No se pudieron cargar los datos: ${this.detalleError(e)}`); }
  }
  titulo(id: string): string { return this.peliculas().find(p => p.id === id)?.titulo ?? 'Película'; }
  async crear(): Promise<void> {
    this.error.set(''); this.mensaje.set(''); this.guardando.set(true);
    try {
      this.minInicio = this.fechaMinuto(new Date(Date.now() + 60_000));
      if (!this.inicio || new Date(this.inicio).getTime() <= Date.now()) {
        this.error.set('Elegí una fecha y hora futura. La función no puede comenzar en el pasado.');
        return;
      }
      const precioBase = await this.programacion.obtenerPrecioEntradaBase();
      await this.programacion.crearFuncion({ peliculaId: this.peliculaId, fechaHoraInicio: this.inicio, formato: this.formato, idioma: this.idioma, precioBase });
      this.mensaje.set(`Función creada con sala compatible y precio base ${precioBase.toLocaleString('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0})}.`); await this.cargarFunciones();
    } catch (e) { this.error.set(`No se pudo crear la función: ${this.detalleError(e)}`); }
    finally { this.guardando.set(false); }
  }
  async eliminar(funcion: Funcion): Promise<void> {
    if (!window.confirm(`¿Eliminar la función del ${funcion.fechaHoraInicio}?`)) return;
    this.error.set(''); this.mensaje.set(''); this.eliminando.set(funcion.id);
    try {
      await this.programacion.eliminarFuncion(funcion.id);
      this.mensaje.set('La función se eliminó correctamente.');
      this.funciones.update(items => items.filter(item => item.id !== funcion.id));
    } catch (e) { this.error.set(`No se pudo eliminar la función: ${this.detalleError(e)}`); }
    finally { this.eliminando.set(null); }
  }
  private async cargarFunciones(): Promise<void> { this.funciones.set(await this.programacion.listarFunciones()); }
  private fechaMinuto(fecha: Date): string { const local = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000); return local.toISOString().slice(0,16); }
  private detalleError(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (error && typeof error === 'object') {
      const dato = error as Record<string, unknown>;
      return ['message', 'details', 'hint', 'code'].map(k => dato[k] ? `${k}: ${String(dato[k])}` : '').filter(Boolean).join(' · ');
    }
    return String(error);
  }
}
