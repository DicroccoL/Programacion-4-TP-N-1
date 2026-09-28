import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Pelicula } from '../../models/pelicula.model';
import { PeliculasService } from '../../core/services/peliculas.service';
import { TarjetaPeliculaComponent } from '../../shared/components/tarjeta-pelicula/tarjeta-pelicula.component';
import { ReseniasService, ResumenResenias } from '../../core/services/resenias.service';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [TarjetaPeliculaComponent, RouterLink],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.css',
})
export class InicioComponent implements OnInit {
  private readonly peliculasService = inject(PeliculasService);
  private readonly reseniasService = inject(ReseniasService);
  readonly peliculas = signal<Pelicula[]>([]);
  readonly proximamente = signal<Pelicula[]>([]);
  readonly resumenesResenias = signal<Record<string, ResumenResenias>>({});
  readonly busqueda = signal('');
  readonly generoSeleccionado = signal('');
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly resumenVacio: ResumenResenias = { promedio: 0, total: 0 };
  readonly generosDisponibles = computed(() => {
    const generos = this.peliculas().flatMap((pelicula) =>
      pelicula.generos?.length
        ? pelicula.generos.map((genero) => genero.nombre)
        : pelicula.genero.split(/[,/]/),
    );

    return [...new Set(generos.map((genero) => genero.trim()).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'es'),
    );
  });
  readonly peliculasFiltradas = computed(() => {
    const termino = this.normalizar(this.busqueda());
    const genero = this.normalizar(this.generoSeleccionado());

    return this.peliculas().filter((pelicula) => {
      const coincideTitulo = !termino || this.normalizar(pelicula.titulo).includes(termino);
      const generos = pelicula.generos?.length
        ? pelicula.generos.map((item) => item.nombre)
        : pelicula.genero.split(/[,/]/);
      const coincideGenero = !genero || generos.some((item) => this.normalizar(item) === genero);

      return coincideTitulo && coincideGenero;
    });
  });


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

      const ids = [...cartelera, ...proximas].map((pelicula) => pelicula.id);
      if (ids.length) {
        try {
          this.resumenesResenias.set(await this.reseniasService.obtenerResumenes(ids));
        } catch {
          // Un problema al consultar reseñas no debe impedir ver la cartelera.
        }
      }
    } catch {
      this.error.set('No se pudo cargar la cartelera.');
    } finally {
      this.cargando.set(false);
    }
  }

  private normalizar(valor: string): string {
    return valor
      .trim()
      .toLocaleLowerCase('es')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
}
