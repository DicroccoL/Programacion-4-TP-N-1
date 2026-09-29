import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

interface DiaCalendario {
  fecha: string;
  numero: number;
  perteneceAlMes: boolean;
}

@Component({
  selector: 'app-selector-fecha',
  standalone: true,
  templateUrl: './selector-fecha.component.html',
  styleUrl: './selector-fecha.component.css',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => SelectorFechaComponent),
    multi: true,
  }],
})
export class SelectorFechaComponent implements ControlValueAccessor {
  @Input() id = '';
  @Input() bloqueado = false;
  readonly meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];
  readonly diasSemana = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  readonly anios = Array.from({ length: 121 }, (_, indice) => new Date().getFullYear() - 100 + indice);

  valor = '';
  fechaVista = new Date();
  fechaTemporal = '';
  abierto = false;
  deshabilitado = false;

  private alCambiar: (valor: string) => void = () => {};
  private alTocar: () => void = () => {};

  get dias(): DiaCalendario[] {
    const anio = this.fechaVista.getFullYear();
    const mes = this.fechaVista.getMonth();
    const primerDia = new Date(anio, mes, 1).getDay();
    const cantidadDias = new Date(anio, mes + 1, 0).getDate();
    const cantidadMesAnterior = new Date(anio, mes, 0).getDate();

    return Array.from({ length: 42 }, (_, indice) => {
      const desplazamiento = indice - primerDia + 1;
      if (desplazamiento < 1) {
        const fecha = new Date(anio, mes - 1, cantidadMesAnterior + desplazamiento);
        return this.crearDia(fecha, false);
      }
      if (desplazamiento > cantidadDias) {
        const fecha = new Date(anio, mes + 1, desplazamiento - cantidadDias);
        return this.crearDia(fecha, false);
      }
      return this.crearDia(new Date(anio, mes, desplazamiento), true);
    });
  }

  get valorVisible(): string {
    if (!this.valor) return '';
    const [anio, mes, dia] = this.valor.split('-');
    return `${dia}/${mes}/${anio}`;
  }

  escribirValor(valor: string): void {
    this.valor = valor ?? '';
    this.alCambiar(this.valor);
  }

  abrir(): void {
    if (this.deshabilitado || this.bloqueado) return;
    const fecha = this.fechaDesdeValor(this.valor) ?? new Date();
    this.fechaVista = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
    this.fechaTemporal = this.valor;
    this.abierto = true;
  }

  navegarMes(cantidad: number): void {
    this.fechaVista = new Date(this.fechaVista.getFullYear(), this.fechaVista.getMonth() + cantidad, 1);
  }

  navegarAnio(cantidad: number): void {
    this.fechaVista = new Date(this.fechaVista.getFullYear() + cantidad, this.fechaVista.getMonth(), 1);
  }

  cambiarMes(mes: string): void {
    this.fechaVista = new Date(this.fechaVista.getFullYear(), Number(mes), 1);
  }

  cambiarAnio(anio: string): void {
    this.fechaVista = new Date(Number(anio), this.fechaVista.getMonth(), 1);
  }

  seleccionarDia(dia: DiaCalendario): void {
    this.fechaTemporal = dia.fecha;
    const fecha = this.fechaDesdeValor(dia.fecha)!;
    this.fechaVista = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
  }

  confirmar(): void {
    this.escribirValor(this.fechaTemporal);
    this.abierto = false;
    this.alTocar();
  }

  cancelar(): void {
    this.fechaTemporal = this.valor;
    this.abierto = false;
    this.alTocar();
  }

  estaSeleccionado(fecha: string): boolean {
    return fecha === this.fechaTemporal;
  }

  writeValue(valor: string): void { this.valor = valor ?? ''; }
  registerOnChange(funcion: (valor: string) => void): void { this.alCambiar = funcion; }
  registerOnTouched(funcion: () => void): void { this.alTocar = funcion; }
  setDisabledState(deshabilitado: boolean): void { this.deshabilitado = deshabilitado; }

  private crearDia(fecha: Date, perteneceAlMes: boolean): DiaCalendario {
    return { fecha: this.aFormatoISO(fecha), numero: fecha.getDate(), perteneceAlMes };
  }

  private aFormatoISO(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  private fechaDesdeValor(valor: string): Date | null {
    const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
    if (!coincidencia) return null;
    return new Date(Number(coincidencia[1]), Number(coincidencia[2]) - 1, Number(coincidencia[3]));
  }
}
