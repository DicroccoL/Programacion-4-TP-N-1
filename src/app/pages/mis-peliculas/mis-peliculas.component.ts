import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ExperienciaClienteService, MiAlertaEstreno, MiPelicula } from '../../core/services/experiencia-cliente.service';
import { FechaArgentinaPipe } from '../../shared/pipes/fecha-argentina.pipe';

@Component({
  selector: 'app-mis-peliculas', standalone: true, imports: [RouterLink],
  template: `
    <main class="mis-peliculas">
      <a routerLink="/" class="volver">← Volver a cartelera</a>
      <header><span>MI CUENTA</span><h1>Mis películas</h1><p>Tus funciones, entradas y opciones de cancelación.</p><p class="puntos">Puntos acumulados: {{ puntos() }} · Crédito disponible: {{ moneda(credito()) }}</p></header>
      @if (mensaje()) {<p class="estado ok" role="status">{{mensaje()}}</p>}
      @if (error()) {<p class="estado error" role="alert">{{error()}}</p>}
      @if (alertas().length) { <section class="alertas"><h2>Alertas de estrenos</h2>@for (alerta of alertas(); track alerta.alertaId) {
        <article><strong>{{ alerta.titulo }}</strong><span>{{ alerta.disponible ? 'Ya hay funciones disponibles' : 'Te avisaremos cuando se habiliten funciones' }}</span></article>
      }</section> }
      @if (cargando()) { <p class="estado">Cargando tu historial…</p> }
      @else if (error()) { <p class="estado error">{{ error() }}</p> }
      @else if (!peliculas().length) { <section class="vacio"><h2>Tu historial está vacío</h2><p>Cuando tengas una entrada confirmada, la película aparecerá acá.</p><a routerLink="/">Explorar cartelera</a></section> }
      @else { <section class="grid">@for (item of peliculas(); track item.ordenId) {
        <article><img [src]="item.imagenUrl || 'logo.png'" [alt]="'Póster de ' + item.titulo"><div><h2>{{ item.titulo }}</h2>
          <p>Función: {{ fecha(item.fechaFuncion) }} · Sala {{ item.sala }} · {{ item.formato }} · {{ idioma(item.idioma) }}</p>
          <p>Butacas: {{ item.butacas.join(', ') }} · Compra: {{ fecha(item.fechaCompra) }}</p>
          <p>Total: {{ moneda(item.total) }}</p><p>QR: <code>{{ item.codigoQr }}</code> · {{ item.qrUsado ? 'Ya utilizado' : 'Válido para presentar' }}</p>
          <p>{{ item.puntajePropio ? 'Tu calificación: ' + item.puntajePropio + '/5' : 'Todavía no la calificaste' }}</p>
          @if (puedeCancelar(item.fechaFuncion)) {<button type="button" [disabled]="cancelando()===item.ordenId" (click)="cancelar(item.ordenId)">{{cancelando()===item.ordenId?'Cancelando…':'Cancelar orden y recibir crédito'}}</button>}
          <a [routerLink]="['/pelicula', item.peliculaId]">Ver película y reseña →</a>
        </div></article>
      }</section> }
    </main>
  `,
  styles: [`
    .mis-peliculas{max-width:1200px;margin:auto;padding:2rem clamp(1rem,4vw,3rem);color:var(--text-primary);min-height:55vh}.volver{color:var(--text-secondary)}header{margin:2rem 0}header>span{color:var(--accent-crimson);font-size:.75rem;letter-spacing:.16em;font-weight:700}header h1{font-size:clamp(2rem,4vw,3rem);margin:.4rem 0}header p,.estado{color:var(--text-secondary)}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:1rem}.grid article{display:grid;grid-template-columns:110px 1fr;gap:1rem;padding:1rem;background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:var(--radius-md)}img{width:110px;aspect-ratio:2/3;object-fit:cover;border-radius:var(--radius-sm)}h2{font-size:1.1rem;margin:.2rem 0 .7rem}.grid p{font-size:.87rem;color:var(--text-secondary);margin:.35rem 0}.grid a,.vacio a{color:var(--accent-crimson)}.grid button{padding:.55rem .7rem;border:1px solid #fb7185;border-radius:var(--radius-sm);background:transparent;color:#fda4af;cursor:pointer}.vacio{padding:2rem;border:1px solid var(--border-subtle);border-radius:var(--radius-md);background:var(--bg-surface)}.error{color:#fda4af}.alertas{margin-bottom:1.5rem;padding:1rem;background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:var(--radius-md)}.alertas article{display:flex;justify-content:space-between;align-items:center;gap:1rem;padding:.65rem 0;border-top:1px solid var(--border-subtle)}.alertas article span{color:var(--text-secondary)}code{font-size:.78rem;word-break:break-all;color:var(--text-primary)}
  `],
})
/**
 * Historial privado del cliente autenticado: entradas, alertas, puntos,
 * crédito y cancelaciones. Las reglas definitivas se controlan en Supabase.
 */
export class MisPeliculasComponent implements OnInit {
  private readonly formatoMoneda = new CurrencyPipe('es-AR');
  private readonly auth = inject(AuthService);
  private readonly experiencia = inject(ExperienciaClienteService);
  private readonly formatoFecha = new FechaArgentinaPipe();
  readonly peliculas = signal<MiPelicula[]>([]);
  readonly alertas = signal<MiAlertaEstreno[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly mensaje = signal('');
  readonly cancelando = signal('');
  readonly puntos = computed(() => this.auth.currentProfile()?.puntosFidelidad ?? 0);
  readonly credito = computed(() => this.auth.currentProfile()?.saldoCredito ?? 0);
  async ngOnInit(): Promise<void> {
    await this.auth.whenReady();
    if (!this.auth.currentUser()) { this.error.set('Iniciá sesión para consultar tu historial.'); this.cargando.set(false); return; }
    try {
      const [peliculas, alertas] = await Promise.all([this.experiencia.obtenerMisPeliculas(), this.experiencia.obtenerMisAlertasEstreno()]);
      this.peliculas.set(peliculas); this.alertas.set(alertas);
    }
    catch { this.error.set('No se pudo cargar el historial. Confirmá que la migración de historial esté aplicada en Supabase.'); }
    finally { this.cargando.set(false); }
  }
  fecha(value: string): string { return this.formatoFecha.transform(value,true); }
  moneda(value: number): string { return this.formatoMoneda.transform(value, 'ARS', 'symbol', '1.0-0') ?? '$ 0'; }
  idioma(value:string):string{return value==='SUBTITULADA'?'Subtitulada':'Castellano';}

  /** Control visual: sólo muestra cancelar si faltan más de dos horas. */
  puedeCancelar(value:string):boolean{return new Date(value).getTime()>Date.now()+2*60*60*1000;}

  
  /** Solicita la cancelación y actualiza el crédito e historial del usuario. */
  async cancelar(ordenId:string):Promise<void>{
    if(!confirm('La orden se cancelará y el total se acreditará como crédito en tu cuenta. ¿Continuar?'))return;
    this.cancelando.set(ordenId);this.error.set('');this.mensaje.set('');
    try{const credito=await this.experiencia.cancelarMiOrden(ordenId);this.mensaje.set(`Orden cancelada. Se acreditaron ${this.moneda(credito)} en tu saldo.`);
      try { await Promise.all([this.auth.refreshCurrentProfile(),this.recargarHistorial()]); }
      catch { this.error.set('La orden se canceló, pero no se pudo actualizar la pantalla. Volvé a cargarla para ver el saldo y el historial actualizados.'); }}
    catch(e){this.error.set(e instanceof Error?e.message:'No se pudo cancelar la orden.');}
    finally{this.cancelando.set('');}
  }
  private async recargarHistorial():Promise<void>{this.peliculas.set(await this.experiencia.obtenerMisPeliculas());}
}
