import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Pelicula } from '../../models/pelicula.model';

@Component({
  selector: 'app-tarjeta-pelicula',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './tarjeta-pelicula.component.html',
  styleUrl: './tarjeta-pelicula.component.css',
})
export class TarjetaPeliculaComponent {
  readonly pelicula = input.required<Pelicula>();
}
