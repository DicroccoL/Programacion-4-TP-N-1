import { Component, inject, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
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

  // Señal de que el formulario fue enviado (para que el padre sepa cambiar de pestaña)
  @Output() guardadoExitoso = new EventEmitter<void>();

  async enviar(): Promise<void> {
    const ok = await this.crud.guardar();
    if (ok) this.guardadoExitoso.emit();
  }

  cancelar(): void {
    this.crud.limpiarEdicion();
  }
}
