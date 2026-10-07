import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RealtimeChannel } from '@supabase/supabase-js';
import { AuthService } from '../../core/services/auth.service';
import { SalasFuncionesService } from '../../core/services/salas-funciones.service';
import { ButacasService } from '../../core/services/butacas.service';
import { ComprasService } from '../../core/services/compras.service';
import { Butaca, Funcion } from '../../models/cine.model';
import { FechaArgentinaPipe } from '../../shared/pipes/fecha-argentina.pipe';
import { SelectorFechaComponent } from '../../shared/components/selector-fecha/selector-fecha.component';

@Component({
  selector: 'app-butacas', standalone: true,
  imports: [CurrencyPipe, FechaArgentinaPipe, RouterLink, FormsModule, SelectorFechaComponent],
  templateUrl: './butacas.component.html', styleUrl: './butacas.component.css',
})
export class ButacasComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly programacion = inject(SalasFuncionesService);
  private readonly butacasService = inject(ButacasService);
  private readonly comprasService = inject(ComprasService);
  private readonly auth = inject(AuthService);
  readonly funcion = signal<Funcion | null>(null);
  readonly peliculaTitulo = signal('');
  readonly butacas = signal<Butaca[]>([]);
  readonly seleccionadas = signal<Butaca[]>([]);
  readonly reservadasPorOtros = signal<Set<string>>(new Set());
  readonly cargando = signal(true);
  readonly comprando = signal(false);
  readonly error = signal('');
  readonly mensaje = signal('');
  readonly fechaNacimientoAnonima = signal('');
  readonly asisteAdulto = signal(false);
  readonly avisoEdadLeido = signal(false);
  codigoCupon = '';
  readonly subtotal = computed(() => this.seleccionadas().reduce((total, butaca) => total + this.precio(butaca), 0));
  readonly edadMinima = computed(() => this.funcion()?.pelicula?.clasificacion === '+18' ? 18 : this.funcion()?.pelicula?.clasificacion === '+13' ? 13 : 0);
  readonly preventaBloqueada = computed(() => {
    const pelicula = this.funcion()?.pelicula;
    return pelicula?.estado === 'PROXIMAMENTE' && !pelicula.preventaActiva;
  });
  readonly fechaNacimiento = computed(() => this.auth.currentProfile()?.fechaNacimiento || this.fechaNacimientoAnonima());
  readonly edadActual = computed(() => {
    const raw=this.fechaNacimiento();if(!raw)return null;
    const nacimiento=new Date(raw);if(Number.isNaN(nacimiento.getTime()))return null;
    let edad=new Date().getFullYear()-nacimiento.getFullYear();const diferencia=new Date().getMonth()-nacimiento.getMonth();
    if(diferencia<0||(diferencia===0&&new Date().getDate()<nacimiento.getDate()))edad--;
    return edad;
  });
  readonly usuarioAutenticado = computed(() => !!this.auth.currentUser());
  readonly compraBloqueadaEdad = computed(() => {
    if (!this.edadMinima()) return false;
    if (!this.usuarioAutenticado()) return !this.avisoEdadLeido();
    return this.edadActual() === null || (this.edadActual()! < this.edadMinima() && !this.asisteAdulto());
  });
  readonly filas = computed(() => {
    const grouped = new Map<string, Butaca[]>();
    for (const seat of this.butacas()) {
      const row = grouped.get(seat.fila) ?? [];
      row.push(seat); grouped.set(seat.fila, row);
    }
    return [...grouped.entries()].map(([letra, seats]) => ({ letra, seats }));
  });
  private funcionId = '';
  private readonly token = crypto.randomUUID();
  private canal?: RealtimeChannel;
  private sincronizador?: ReturnType<typeof setInterval>;

  async ngOnInit(): Promise<void> {
    this.funcionId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.funcionId) { this.error.set('No se encontró la función.'); this.cargando.set(false); return; }
    try {
      await this.auth.whenReady();
      const [funciones, butacas] = await Promise.all([
        this.programacion.listarFunciones(), this.butacasService.obtenerButacas(this.funcionId),
      ]);
      this.funcion.set(funciones.find(f => f.id === this.funcionId) ?? null);
      this.peliculaTitulo.set(this.funcion()?.pelicula?.titulo ?? '');
      this.butacas.set(butacas);
      if (!this.funcion()) throw new Error('La función ya no está disponible.');
      await this.actualizarReservas();
      this.canal = this.butacasService.canalReservas(this.funcionId, () => void this.actualizarReservas());
      this.sincronizador = setInterval(() => void this.actualizarReservas(), 15000);
    } catch (e) { this.error.set(e instanceof Error ? e.message : 'No se pudo cargar el mapa de butacas.'); }
    finally { this.cargando.set(false); }
  }

  ngOnDestroy(): void {
    if (this.canal) void this.auth.client.removeChannel(this.canal);
    if (this.sincronizador) clearInterval(this.sincronizador);
    if (this.seleccionadas().length) void this.butacasService.liberarReservas(this.token, this.seleccionadas().map(b => b.id));
  }

  precio(butaca: Butaca): number {
    const base = this.funcion()?.precioBase ?? 0;
    return butaca.tipo === 'VIP' ? Math.round(base * 1.5) : base;
  }
  estaSeleccionada(id: string): boolean { return this.seleccionadas().some(b => b.id === id); }
  estaReservada(id: string): boolean { return this.reservadasPorOtros().has(id); }
  async alternar(butaca: Butaca): Promise<void> {
    this.error.set(''); this.mensaje.set('');
    if (this.preventaBloqueada()) { this.error.set('La compra todavía no está habilitada: esta película no tiene la preventa activa.'); return; }
    if (butaca.ocupadaEnFuncion || this.estaReservada(butaca.id)) return;
    const current = this.seleccionadas();
    if (this.estaSeleccionada(butaca.id)) {
      this.seleccionadas.set(current.filter(b => b.id !== butaca.id));
      try { await this.butacasService.liberarReservas(this.token, [butaca.id]); }
      catch { this.error.set('No se pudo liberar la reserva de la butaca.'); }
      return;
    }
    if (current.length >= 8) { this.error.set('Podés seleccionar hasta 8 butacas por compra.'); return; }
    try {
      await this.butacasService.reservarButaca(this.funcionId, butaca.id, this.token);
      this.seleccionadas.set([...current, butaca]);
      await this.actualizarReservas();
    } catch (e) {
      await this.actualizarReservas();
      this.error.set(e instanceof Error ? e.message : 'Otra persona acaba de reservar esa butaca. Elegí otra.');
    }
  }

  async comprar(): Promise<void> {
    if (this.preventaBloqueada()) { this.error.set('La compra todavía no está habilitada: esta película no tiene la preventa activa.'); return; }
    if (!this.seleccionadas().length) return;
    this.comprando.set(true); this.error.set(''); this.mensaje.set('');
    try {
      const comprobante = await this.comprasService.crearOrden(this.funcionId,
        this.seleccionadas().map(b => b.id), this.token, this.usuarioAutenticado() ? (this.fechaNacimiento() || null) : null,
        this.usuarioAutenticado() ? this.asisteAdulto() : this.avisoEdadLeido(), this.codigoCupon);
      // La compra ya se confirmó: un fallo al recargar puntos no debe ocultar el ticket.
      try { await this.auth.refreshCurrentProfile(); } catch { /* Se recargará al volver a iniciar sesión. */ }
      try { sessionStorage.setItem(`ticket:${comprobante.ordenId}`, JSON.stringify(comprobante)); } catch { /* La navegación conserva el ticket en history.state. */ }
      this.seleccionadas.set([]);
      await this.router.navigate(['/ticket', comprobante.ordenId], { state: { comprobante } });
    } catch (e) { this.error.set(this.mensajeErrorCompra(e)); }
    finally { this.comprando.set(false); }
  }

  private mensajeErrorCompra(error: unknown): string {
    const detalle = error as { message?: string; code?: string; details?: string; hint?: string } | null;
    const mensaje = detalle?.message || (error instanceof Error ? error.message : 'Error desconocido al crear la orden.');
    const texto = `${mensaje} ${detalle?.details ?? ''} ${detalle?.hint ?? ''}`;
    if (detalle?.code === 'PGRST202' && texto.includes('crear_orden_con_comprobante')) {
      return 'Falta instalar la función de creación del ticket en Supabase. Ejecutá supabase/sql/comprobante-compra-qr.sql en el SQL Editor y luego volvé a intentar.';
    }
    if (/crear_orden_butacas_pendiente/i.test(texto) && /function|schema cache|does not exist|no existe/i.test(texto)) {
      return 'Falta instalar o actualizar la función SQL que crea las órdenes. Ejecutá supabase/sql/retener-butacas-orden-pendiente.sql y supabase/sql/comprobante-compra-qr.sql en Supabase y volvé a intentar.';
    }
    if (/obtener_comprobante_orden/i.test(texto) && /function|schema cache|does not exist|no existe/i.test(texto)) {
      return 'Falta instalar la función SQL del comprobante. Ejecutá supabase/sql/comprobante-compra-qr.sql en Supabase y volvé a intentar.';
    }
    if (detalle?.code === '23505' && texto.includes('entradas_funcion_id_butaca_id_key')) {
      return 'Esa butaca ya está asociada a una orden anterior. Recargá el mapa y elegí otra butaca.';
    }
    return detalle?.code ? `${mensaje} (código ${detalle.code})` : mensaje;
  }

  private async actualizarReservas(): Promise<void> {
    try {
      const [active, disponibles] = await Promise.all([
        this.butacasService.obtenerReservasActivas(this.funcionId),
        this.butacasService.obtenerButacas(this.funcionId),
      ]);
      const own = new Set(this.seleccionadas().map(b => b.id));
      // Una reserva propia se representa en turquesa y se puede quitar desde el resumen.
      this.butacas.set(disponibles.map(b => own.has(b.id) ? { ...b, ocupadaEnFuncion: false } : b));
      this.reservadasPorOtros.set(new Set(active.filter(r => !own.has(r.butacaId)).map(r => r.butacaId)));
    } catch { /* La RPC sigue siendo la autoridad al intentar adquirir una butaca. */ }
  }
}
