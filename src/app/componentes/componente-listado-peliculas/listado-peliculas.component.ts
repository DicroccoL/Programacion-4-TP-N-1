import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Pelicula } from '../../models/pelicula.model';

@Component({
  selector: 'app-listado-peliculas',
  standalone: true,
  templateUrl: './listado-peliculas.component.html',
  styleUrl: './listado-peliculas.component.css',
})
export class ListadoPeliculasComponent {
  @Input({ required: true }) peliculas: Pelicula[] = [];
  @Input() cargando = false;
  @Input() error = '';

  @Output() editar = new EventEmitter<Pelicula>();
  @Output() eliminar = new EventEmitter<Pelicula>();
}
