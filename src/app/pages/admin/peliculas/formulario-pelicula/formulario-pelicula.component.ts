import { Component, inject, EventEmitter, Output } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { PeliculasCrudService } from '../../../../core/services/peliculas-crud.service';

@Component({
  selector: 'app-formulario-pelicula',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './formulario-pelicula.component.html',
  styleUrl: './formulario-pelicula.component.css',
})
export class FormularioPeliculaComponent {
  readonly crud = inject(PeliculasCrudService);
  readonly patronTextoNoVacio = '.*\\S.*';
  readonly patronUrl = 'https?://[^\\s/$.?#].[^\\s]*';

  // Señal de que el formulario fue enviado (para que el padre sepa cambiar de pestaña)
  @Output() guardadoExitoso = new EventEmitter<void>();

  async enviar(formulario: NgForm): Promise<void> {
    formulario.control.markAllAsTouched();
    if (formulario.invalid) return;

    const ok = await this.crud.guardar();
    if (ok) this.guardadoExitoso.emit();
  }

  cambiarPreventa(activa: boolean): void {
    this.crud.formulario.update((formulario) => ({
      ...formulario,
      preventaActiva: activa,
      precioPreventa: activa ? formulario.precioPreventa : null,
    }));
  }

  cancelar(): void {
    this.crud.limpiarEdicion();
  }
}
