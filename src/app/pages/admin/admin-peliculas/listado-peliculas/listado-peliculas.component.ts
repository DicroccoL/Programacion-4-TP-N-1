import { Component, inject, EventEmitter, Output } from '@angular/core';
import { Pelicula } from '../../../../models/pelicula.model';
import { PeliculasCrudService } from '../../../../core/services/peliculas-crud.service';

@Component({
  selector: 'app-listado-peliculas',
  standalone: true,
  templateUrl: './listado-peliculas.component.html',
  styleUrl: './listado-peliculas.component.css',
})
export class ListadoPeliculasComponent {
  readonly crud = inject(PeliculasCrudService);

  // Notifica al padre para que cambie a la pestaña "crear" cuando se edita
  @Output() editarSolicitado = new EventEmitter<void>();

  editar(pelicula: Pelicula): void {
    this.crud.iniciarEdicion(pelicula);
    this.editarSolicitado.emit();
  }

  eliminar(pelicula: Pelicula): void {
    this.crud.eliminar(pelicula);
  }
}

