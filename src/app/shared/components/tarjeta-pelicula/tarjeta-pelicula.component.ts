import { Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Pelicula } from '../../../models/pelicula.model';
import { ResumenResenias } from '../../../core/services/resenias.service';

@Component({
  selector: 'app-tarjeta-pelicula',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  templateUrl: './tarjeta-pelicula.component.html',
  styleUrl: './tarjeta-pelicula.component.css',
})

// La plantilla crea una tarjeta reutilizable por cada película de la lista.
export class TarjetaPeliculaComponent {
  readonly pelicula = input.required<Pelicula>();
  readonly resumenResenias = input<ResumenResenias>({ promedio: 0, total: 0 });
}
