import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CrearPeliculaDTO, EstadoPelicula } from '../../models/pelicula.model';

@Component({
  selector: 'app-formulario-pelicula',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './formulario-pelicula.component.html',
  styleUrl: './formulario-pelicula.component.css',
})
export class FormularioPeliculaComponent {
  @Input({ required: true }) formulario!: CrearPeliculaDTO;
  @Input({ required: true }) estados: EstadoPelicula[] = [];
  @Input() peliculaEditandoId: string | null = null;
  @Input() guardando = false;
  @Input() mensaje = '';
  @Input() error = '';

  @Output() guardar = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<void>();
}
