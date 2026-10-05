import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-selector-fecha',
  standalone: true,
  templateUrl: './selector-fecha.component.html',
  styleUrl: './selector-fecha.component.css',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SelectorFechaComponent), multi: true }],
})
export class SelectorFechaComponent implements ControlValueAccessor {
  @Input() id = '';
  @Input() bloqueado = false;
  dia = '';
  mes = '';
  anio = '';
  deshabilitado = false;
  private alCambiar: (valor: string) => void = () => {};
  private alTocar: () => void = () => {};

  escribir(segmento: 'dia' | 'mes' | 'anio', evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const maximo = segmento === 'anio' ? 4 : 2;
    const valor = input.value.replace(/\D/g, '').slice(0, maximo);
    input.value = valor;
    this[segmento] = valor;
    const iso = this.aIso();
    this.alCambiar(iso ?? '');
  }

  writeValue(valor: string | null): void {
    if (!valor) { this.dia = ''; this.mes = ''; this.anio = ''; return; }
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
    this.anio = match?.[1] ?? '';
    this.mes = match?.[2] ?? '';
    this.dia = match?.[3] ?? '';
  }

  registerOnChange(fn: (valor: string) => void): void { this.alCambiar = fn; }
  registerOnTouched(fn: () => void): void { this.alTocar = fn; }
  setDisabledState(deshabilitado: boolean): void { this.deshabilitado = deshabilitado; }
  tocar(): void { this.alTocar(); }

  private aIso(): string | null {
    if (this.dia.length !== 2 || this.mes.length !== 2 || this.anio.length !== 4) return null;
    const dia = Number(this.dia), mes = Number(this.mes), anio = Number(this.anio);
    if (anio < 1 || mes < 1 || mes > 12 || dia < 1) return null;
    const fecha = new Date(anio, mes - 1, dia);
    if (fecha.getFullYear() !== anio || fecha.getMonth() !== mes - 1 || fecha.getDate() !== dia) return null;
    return `${this.anio}-${this.mes}-${this.dia}`;
  }
}
