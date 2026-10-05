import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormatoProyeccion, IdiomaFuncion, Sala } from '../../../models/cine.model';
import { ProgramacionService } from '../../../core/services/programacion.service';

@Component({
  selector: 'app-admin-salas', standalone: true, imports: [FormsModule],
  template: `
    <section class="programacion-admin">
      <div class="cabecera-modulo"><div><h3>Salas y butacas</h3><p>Elegí un único formato (2D o 3D) y un único idioma por sala.</p></div></div>
      <form class="form-programacion" (ngSubmit)="crear()">
        <label>Número de sala<input name="numero" type="number" min="1" required [(ngModel)]="numero" /></label>
        <fieldset><legend>Formato de la sala</legend>@for (formato of formatos; track formato) {<label class="opcion"><input type="radio" name="formatoSala" [checked]="formatoElegido() === formato" (change)="formatoElegido.set(formato)" />{{ formato }}</label>}</fieldset>
        <fieldset><legend>Idioma de la sala</legend>@for (idioma of idiomas; track idioma) {<label class="opcion"><input type="radio" name="idiomaSala" [checked]="idiomaElegido() === idioma" (change)="idiomaElegido.set(idioma)" />{{ idioma === 'CASTELLANO' ? 'Castellano' : 'Subtitulada' }}</label>}</fieldset>
        <button class="accion-principal" type="submit" [disabled]="guardando() || eliminandoSalaId() !== null">{{ guardando() ? 'Creando…' : 'Crear sala y generar butacas' }}</button>
      </form>
      @if (mensaje()) {<p class="aviso exito" role="status">{{ mensaje() }}</p>}
      @if (error()) {<p class="aviso error" role="alert">{{ error() }}</p>}
      <div class="lista-salas"><h4>Salas creadas</h4>
        @if (salas().length === 0) {<p class="vacio">Todavía no hay salas.</p>}
        @for (sala of salas(); track sala.id) {
          <article>
            <strong>Sala {{ sala.numero }}</strong>
            <span>{{ sala.formatos?.join(' · ') }}</span>
            <span>{{ idiomasTexto(sala) }}</span>
            <button
              class="accion-eliminar"
              type="button"
              [disabled]="guardando() || eliminandoSalaId() !== null"
              [attr.aria-label]="'Eliminar sala ' + sala.numero"
              (click)="eliminar(sala)"
            >
              {{ eliminandoSalaId() === sala.id ? 'Eliminando…' : 'Eliminar sala' }}
            </button>
          </article>
        }
      </div>
    </section>
  `,
  styles: [`
    .programacion-admin{display:grid;gap:1.25rem;color:var(--text-primary)}.cabecera-modulo p,.vacio{color:var(--text-muted);margin-top:.25rem}.form-programacion{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;align-items:end;padding:1.25rem;background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:var(--radius-md)}
    .form-programacion>label{display:grid;gap:.4rem;color:var(--text-secondary);font-size:.85rem}.form-programacion input[type=number]{width:100%;padding:.7rem;background:var(--bg-input);border:1px solid var(--border-strong);border-radius:var(--radius-sm)}fieldset{border:1px solid var(--border-subtle);border-radius:var(--radius-sm);display:flex;gap:.8rem;flex-wrap:wrap;min-height:72px}legend{font-size:.8rem;color:var(--text-secondary)}.opcion{display:flex;align-items:center;gap:.35rem;font-size:.85rem}.accion-principal{padding:.75rem 1rem;border:0;border-radius:var(--radius-sm);background:var(--accent-crimson);font-weight:700;cursor:pointer}.accion-principal:disabled,.accion-eliminar:disabled{opacity:.6;cursor:wait}.lista-salas{display:grid;gap:.65rem}.lista-salas article{display:flex;align-items:center;gap:1rem;flex-wrap:wrap;padding:.9rem 1rem;background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:var(--radius-sm)}.lista-salas article span{color:var(--text-secondary)}.accion-eliminar{margin-left:auto;padding:.55rem .8rem;border:1px solid #fda4af66;border-radius:var(--radius-sm);background:#88133755;color:#fda4af;font-weight:600;cursor:pointer}.accion-eliminar:hover:not(:disabled){background:#881337aa}.aviso{padding:.75rem 1rem;border-radius:var(--radius-sm)}.exito{color:#6ee7b7;background:#064e3b55}.error{color:#fda4af;background:#88133755}
  `],
})
export class AdminSalasComponent implements OnInit {
  private readonly programacion = inject(ProgramacionService);
  readonly formatos: FormatoProyeccion[] = ['2D','3D'];
  readonly idiomas: IdiomaFuncion[] = ['CASTELLANO','SUBTITULADA'];
  readonly formatoElegido = signal<FormatoProyeccion>('2D');
  readonly idiomaElegido = signal<IdiomaFuncion>('CASTELLANO');
  readonly salas = signal<Sala[]>([]); readonly guardando = signal(false);
  readonly eliminandoSalaId = signal<string | null>(null);
  readonly error = signal(''); readonly mensaje = signal(''); numero = 1;
  async ngOnInit(): Promise<void> { await this.cargar(); }
  idiomasTexto(sala: Sala): string { return (sala.idiomas ?? []).map(i => i === 'CASTELLANO' ? 'Castellano' : 'Subtitulada').join(' · '); }
  async crear(): Promise<void> {
    this.error.set(''); this.mensaje.set('');
    this.guardando.set(true);
    try {
      await this.programacion.crearSala({ numero: this.numero, formatos: [this.formatoElegido()], idiomas: [this.idiomaElegido()] });
      const creada = this.numero;
      await this.cargar();
      this.mensaje.set(`Sala ${creada} creada con su mapa de butacas.`);
      this.numero = this.siguienteNumero();
    }
    catch (e) {
      const detalle = this.detalleError(e);
      this.error.set(this.errorRpc(detalle));
    }
    finally { this.guardando.set(false); }
  }
  async eliminar(sala: Sala): Promise<void> {
    const confirmar = confirm(
      `¿Querés eliminar la sala ${sala.numero}? Solo se puede borrar si no tiene funciones asociadas.`,
    );
    if (!confirmar) return;

    this.error.set('');
    this.mensaje.set('');
    this.eliminandoSalaId.set(sala.id);
    try {
      await this.programacion.eliminarSala(sala.id);
      const salasActualizadas = await this.programacion.listarSalas();
      this.salas.set(salasActualizadas);
      if (salasActualizadas.some(item => item.id === sala.id)) {
        throw new Error(
          'La sala todavía aparece en Supabase después del borrado. Revisá las políticas de acceso de la tabla salas.',
        );
      }
      this.mensaje.set(`La sala ${sala.numero} fue eliminada.`);
      this.numero = this.siguienteNumero();
    } catch (e) {
      const detalle = this.detalleError(e);
      const normalizado = detalle.toLowerCase();
      if (
        normalizado.includes('pgrst202') ||
        (normalizado.includes('eliminar_sala_sin_funciones') &&
          (normalizado.includes('does not exist') ||
            normalizado.includes('could not find') ||
            normalizado.includes('schema cache')))
      ) {
        this.error.set(
          'Falta instalar la operación de borrado de salas en Supabase. Ejecutá supabase/sql/eliminar-sala-sin-funciones.sql en el SQL Editor y volvé a intentar.',
        );
      } else {
        this.error.set(detalle || 'No se pudo eliminar la sala.');
      }
    } finally {
      this.eliminandoSalaId.set(null);
    }
  }
  private async cargar(): Promise<void> {
    try { this.salas.set(await this.programacion.listarSalas()); this.numero = this.siguienteNumero(); }
    catch (e) { this.error.set(`No se pudieron cargar las salas: ${this.detalleError(e)}`); }
  }
  private siguienteNumero(): number {
    const usados = new Set(this.salas().map(s => s.numero));
    let candidato = 1;
    while (usados.has(candidato)) candidato++;
    return candidato;
  }
  private errorRpc(detalle: string): string {
    const normalized = detalle.toLowerCase();
    if (normalized.includes('crear_sala_con_butacas') && (normalized.includes('does not exist') || normalized.includes('could not find the function') || normalized.includes('schema cache'))) {
      return `Falta instalar o refrescar la función crear_sala_con_butacas en Supabase. Ejecutá supabase/sql/funciones-salas-butacas.sql en el SQL Editor. Detalle: ${detalle}`;
    }
    if (normalized.includes('solo un administrador') || normalized.includes('permission denied') || normalized.includes('not allowed')) {
      return `Supabase rechazó la operación por permisos. Confirmá que el usuario tenga rol admin en public.perfiles y que haya iniciado sesión. Detalle: ${detalle}`;
    }
    if (normalized.includes('duplicate key') || normalized.includes('unique constraint')) {
      return `El número de sala ${this.numero} ya existe. Elegí otro número.`;
    }
    return `No se pudo crear la sala: ${detalle}`;
  }
  private detalleError(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object') {
      const dato = error as Record<string, unknown>;
      const partes = ['message', 'details', 'hint', 'code']
        .map(clave => dato[clave] == null ? '' : `${clave}: ${String(dato[clave])}`)
        .filter(Boolean);
      return partes.length ? partes.join(' · ') : JSON.stringify(dato);
    }
    return String(error);
  }
}
