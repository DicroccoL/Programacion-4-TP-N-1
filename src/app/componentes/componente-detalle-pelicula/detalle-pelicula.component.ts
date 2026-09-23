import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Pelicula } from '../../models/pelicula.model';
import { PeliculasService } from '../../services/peliculas';

@Component({
  selector: 'app-detalle-pelicula',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './detalle-pelicula.component.html',
  styleUrl: './detalle-pelicula.component.css',
})
export class DetallePeliculaComponent implements OnInit {
  private readonly ruta = inject(ActivatedRoute);
  private readonly peliculasService = inject(PeliculasService);

  readonly pelicula = signal<Pelicula | null>(null);
  readonly cargando = signal(true);
  readonly error = signal('');

  async ngOnInit(): Promise<void> {
    const id = this.ruta.snapshot.paramMap.get('id');

    if (!id) {
      this.error.set('No se encontró la película solicitada.');
      this.cargando.set(false);
      return;
    }

    try {
      this.pelicula.set(await this.peliculasService.obtenerPorId(id));
    } catch {
      this.error.set('No se pudo cargar el detalle de la película.');
    } finally {
      this.cargando.set(false);
    }
  }

}
