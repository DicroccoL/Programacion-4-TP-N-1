import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Pelicula } from '../../models/pelicula.model';
import { PeliculasService } from '../../core/services/peliculas.service';
import { TarjetaPeliculaComponent } from '../../shared/components/tarjeta-pelicula/tarjeta-pelicula.component';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [TarjetaPeliculaComponent, RouterLink],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.css',
})
export class InicioComponent implements OnInit {
  private readonly peliculasService = inject(PeliculasService);
  readonly peliculas = signal<Pelicula[]>([]);
  readonly proximamente = signal<Pelicula[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');


  //llama en paralelo  a peliculas service y muestra las peliculas en cartelera y proximamente
  async ngOnInit(): Promise<void> {
    try {
      const [cartelera, proximas] = await Promise.all([
        this.peliculasService.obtenerCartelera(),
        this.peliculasService.obtenerProximamente(),
      ]);
      
//guarda los resultados en señales peliculas y proximamente 
      this.peliculas.set(cartelera);
      this.proximamente.set(proximas);
    } catch {
      this.error.set('No se pudo cargar la cartelera.');
    } finally {
      this.cargando.set(false);
    }
  }
}
