import { Component, inject, EventEmitter, Output, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { PeliculasCrudService } from '../../../../core/services/peliculas-crud.service';
import { SelectorFechaComponent } from '../../../../shared/components/selector-fecha/selector-fecha.component';
import { ImagenesService } from '../../../../core/services/imagenes.service';

@Component({
  selector: 'app-formulario-pelicula',
  standalone: true,
  imports: [FormsModule, SelectorFechaComponent],
  templateUrl: './formulario-pelicula.component.html',
  styleUrl: './formulario-pelicula.component.css',
})
/** Formulario reutilizable para crear o editar una película. */
export class FormularioPeliculaComponent {
  readonly crud = inject(PeliculasCrudService);
  private readonly imagenes = inject(ImagenesService);
  readonly subiendoImagen = signal(false);
  readonly errorImagen = signal('');
  readonly patronTextoNoVacio = '.*\\S.*';
  readonly patronUrl = 'https?://[^\\s/$.?#].[^\\s]*';

  // Señal de que el formulario fue enviado (para que el padre sepa cambiar de pestaña)
  @Output() guardadoExitoso = new EventEmitter<void>();

  async enviar(formulario: NgForm): Promise<void> {
    if (this.subiendoImagen()) return;
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

  async subirImagen(evento: Event): Promise<void> {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo || this.subiendoImagen()) return;
    this.errorImagen.set(''); this.subiendoImagen.set(true);
    try {
      const imagenUrl = await this.imagenes.subirPoster(archivo);
      this.crud.formulario.update(formulario => ({ ...formulario, imagenUrl }));
    } catch (error) {
      this.errorImagen.set(error instanceof Error ? error.message : 'No se pudo subir la imagen.');
    } finally { this.subiendoImagen.set(false); input.value = ''; }
  }

  cancelar(): void {
    this.crud.limpiarEdicion();
  }
}
