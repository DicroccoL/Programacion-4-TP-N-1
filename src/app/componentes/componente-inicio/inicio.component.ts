import { Component, inject, OnInit, signal } from '@angular/core';
import { Pelicula } from '../../models/pelicula.model';
import { PeliculasService } from '../../services/peliculas';
import { TarjetaPeliculaComponent } from '../componente-tarjeta-pelicula/tarjeta-pelicula.component';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [TarjetaPeliculaComponent],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.css',
})
export class InicioComponent implements OnInit {
  private readonly peliculasService = inject(PeliculasService);
  readonly peliculas = signal<Pelicula[]>([]);
  readonly proximamente = signal<Pelicula[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');

  async ngOnInit(): Promise<void> {
    try {
      const [cartelera, proximas] = await Promise.all([
        this.peliculasService.obtenerCartelera(),
        this.peliculasService.obtenerProximamente(),
      ]);

      this.peliculas.set(cartelera);
      this.proximamente.set(proximas);
    } catch {
      this.error.set('No se pudo cargar la cartelera.');
    } finally {
      this.cargando.set(false);
    }
  }
}
