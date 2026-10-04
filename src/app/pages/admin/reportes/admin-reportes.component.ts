import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

interface VentaDia { dia:string; facturacion:number; entradas_vendidas:number; }
interface OrdenPendiente { orden_id:string; correo:string|null; nombre:string|null; total:number; fecha_compra:string; codigo_qr:string; }
interface PeliculaVendida { pelicula_id:string; titulo:string; entradas_vendidas:number; }
interface ProductoVendido { producto:string; cantidad_vendida:number; }
interface Actividad { actividad_id:string; correo:string|null; accion:string; detalle:string; fecha_hora:string; }

@Component({
  selector:'app-admin-reportes',standalone:true,imports:[FormsModule],
  template:`
    <section class="reportes"><header><h3>Ventas y auditoría</h3><p>Consultá ventas confirmadas, aprobá pagos manuales y exportá el resumen.</p></header>
      <section class="panel"><h4>Período</h4><div class="rango"><button type="button" (click)="periodo(7)">Últimos 7 días</button><button type="button" (click)="periodo(30)">Últimos 30 días</button><label>Desde<input type="date" [(ngModel)]="desde" name="desde"></label><label>Hasta<input type="date" [(ngModel)]="hasta" name="hasta"></label><button type="button" (click)="cargar()">Actualizar</button><button type="button" (click)="exportarCsv()">Exportar Excel (CSV)</button><button type="button" (click)="imprimir()">Guardar PDF</button></div></section>
      @if(error()){<p class="error" role="alert">{{error()}}</p>} @if(mensaje()){<p class="ok" role="status">{{mensaje()}}</p>}
      <section class="panel"><h4>Órdenes pendientes</h4>@if(pendientes().length){<div class="tabla-scroll"><table><thead><tr><th>Fecha</th><th>Usuario</th><th>Total</th><th>Acción</th></tr></thead><tbody>@for(o of pendientes();track o.orden_id){<tr><td>{{fecha(o.fecha_compra)}}</td><td>{{o.nombre||'Invitado'}} · {{o.correo||'Anónimo'}}</td><td>{{moneda(o.total)}}</td><td><button type="button" [disabled]="procesando()===o.orden_id" (click)="confirmar(o)">{{procesando()===o.orden_id?'Procesando…':'Confirmar pago recibido'}}</button></td></tr>}</tbody></table></div>}@else{<p>No hay órdenes pendientes.</p>}</section>
      <section class="panel imprimible"><h4>Facturación diaria y entradas vendidas</h4>@if(ventas().length){<div class="tabla-scroll"><table><thead><tr><th>Día</th><th>Facturación</th><th>Entradas</th></tr></thead><tbody>@for(v of ventas();track v.dia){<tr><td>{{v.dia}}</td><td>{{moneda(v.facturacion)}}</td><td>{{v.entradas_vendidas}}</td></tr>}</tbody></table></div>}@else{<p>Sin ventas confirmadas en este período.</p>}</section>
      <section class="panel"><h4>Películas más vistas</h4>@for(p of peliculas();track p.pelicula_id){<div class="barra-fila"><span>{{p.titulo}}</span><div><i [style.width.%]="ancho(p.entradas_vendidas,maxPelicula())"></i></div><strong>{{p.entradas_vendidas}}</strong></div>}@if(!peliculas().length){<p>No hay ventas para el período.</p>}</section>
      <section class="panel"><h4>Productos más vendidos</h4>@for(p of productos();track p.producto){<div class="barra-fila"><span>{{p.producto}}</span><div><i [style.width.%]="ancho(p.cantidad_vendida,maxCandy())"></i></div><strong>{{p.cantidad_vendida}}</strong></div>}@if(!productos().length){<p>Sin ventas de Candy Bar en el período.</p>}</section>
      <section class="panel"><h4>Actividad reciente</h4>@for(a of actividades();track a.actividad_id){<p>{{fecha(a.fecha_hora)}} · {{a.correo||'Sistema'}} · {{a.accion}} — {{a.detalle}}</p>}@if(!actividades().length){<p>No hay actividad registrada o falta ejecutar la migración de auditoría.</p>}</section>
    </section>
  `,
  styles:[`.reportes{display:grid;gap:1rem;color:var(--text-primary)}.reportes header p,.panel p{color:var(--text-secondary)}.panel{padding:1rem;background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:var(--radius-md)}.panel h4{margin:0 0 .8rem}.rango{display:flex;gap:.75rem;align-items:end;flex-wrap:wrap}.rango label{display:grid;gap:.3rem;color:var(--text-secondary)}input{padding:.6rem;background:var(--bg-input);border:1px solid var(--border-strong);border-radius:var(--radius-sm);color:var(--text-primary)}button{padding:.6rem .8rem;border:0;border-radius:var(--radius-sm);background:var(--accent-crimson);color:white;font-weight:700;cursor:pointer}button:disabled{opacity:.6}.tabla-scroll{overflow:auto}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:.7rem;border-bottom:1px solid var(--border-subtle)}.barra-fila{display:grid;grid-template-columns:minmax(100px,210px) minmax(80px,1fr) 44px;align-items:center;gap:.75rem;padding:.45rem 0}.barra-fila>div{height:12px;border-radius:10px;background:var(--bg-input);overflow:hidden}.barra-fila i{display:block;height:100%;border-radius:10px;background:var(--accent-crimson)}.error{color:#fda4af}.ok{color:#6ee7b7}@media print{.rango,button{display:none!important}.panel{break-inside:avoid;background:white;color:black}.reportes{color:black}}`],
})
export class AdminReportesComponent implements OnInit {
  private readonly auth=inject(AuthService);
  private readonly hoy=new Date();
  desde=new Date(this.hoy.getTime()-29*86400000).toISOString().slice(0,10);
  hasta=this.hoy.toISOString().slice(0,10);
  readonly ventas=signal<VentaDia[]>([]); readonly pendientes=signal<OrdenPendiente[]>([]);
  readonly peliculas=signal<PeliculaVendida[]>([]); readonly productos=signal<ProductoVendido[]>([]); readonly actividades=signal<Actividad[]>([]);
  readonly error=signal(''); readonly mensaje=signal(''); readonly procesando=signal('');
  maxPelicula():number{return Math.max(1,...this.peliculas().map(x=>x.entradas_vendidas));}
  maxCandy():number{return Math.max(1,...this.productos().map(x=>x.cantidad_vendida));}
  ancho(valor:number,maximo:number):number{return Math.max(3,valor/maximo*100);}
  periodo(dias:number):void{const hoy=new Date();this.hasta=hoy.toISOString().slice(0,10);this.desde=new Date(hoy.getTime()-(dias-1)*86400000).toISOString().slice(0,10);void this.cargar();}
  ngOnInit():void{void this.cargar();}
  async cargar():Promise<void>{
    this.error.set('');
    try{
      const [ventas,pendientes,peliculas,productos,actividades]=await Promise.all([
        this.auth.client.rpc('obtener_reporte_ventas_diarias',{p_desde:this.desde,p_hasta:this.hasta}),
        this.auth.client.rpc('obtener_ordenes_pendientes_admin'),
        this.auth.client.rpc('obtener_reporte_peliculas_vendidas',{p_desde:this.desde,p_hasta:this.hasta}),
        this.auth.client.rpc('obtener_reporte_candy_vendido',{p_desde:this.desde,p_hasta:this.hasta}),
        this.auth.client.rpc('obtener_log_actividad_admin'),
      ]);
      const failure=[ventas,pendientes,peliculas,productos,actividades].find(result=>result.error);
      if(failure?.error)throw failure.error;
      this.ventas.set(ventas.data??[]);this.pendientes.set(pendientes.data??[]);this.peliculas.set(peliculas.data??[]);this.productos.set(productos.data??[]);this.actividades.set(actividades.data??[]);
    }catch(e){this.error.set(e instanceof Error?e.message:'No se pudieron cargar los reportes. Ejecutá supabase/sql/pendientes-consigna.sql.');}
  }
  async confirmar(order:OrdenPendiente):Promise<void>{
    this.procesando.set(order.orden_id);this.error.set('');this.mensaje.set('');
    try{const {data,error}=await this.auth.client.rpc('confirmar_pago_orden',{p_orden_id:order.orden_id});if(error)throw error;
      this.mensaje.set(`Pago confirmado. Se acreditaron ${Number(data)||0} puntos a la cuenta asociada.`);await this.cargar();
    }catch(e){this.error.set(e instanceof Error?e.message:'No se pudo confirmar el pago.');}
    finally{this.procesando.set('');}
  }
  exportarCsv():void{
    const rows=[['Día','Facturación','Entradas vendidas'],...this.ventas().map(v=>[v.dia,String(v.facturacion),String(v.entradas_vendidas)])];
    const blob=new Blob(['\uFEFF'+rows.map(r=>r.map(v=>'"'+v.replaceAll('"','""')+'"').join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`reporte-ventas-${this.desde}-${this.hasta}.csv`;a.click();URL.revokeObjectURL(url);
  }
  imprimir():void{window.print();}
  moneda(value:number):string{return new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(value);}
  fecha(value:string):string{return new Intl.DateTimeFormat('es-AR',{dateStyle:'short',timeStyle:'short'}).format(new Date(value));}
}
