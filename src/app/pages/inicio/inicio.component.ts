import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GENEROS_PELICULA, Pelicula } from '../../models/pelicula.model';
import { PeliculasService } from '../../core/services/peliculas.service';
import { TarjetaPeliculaComponent } from '../../shared/components/tarjeta-pelicula/tarjeta-pelicula.component';
import { ReseniasService, ResumenResenias } from '../../core/services/resenias.service';
import { AuthService } from '../../core/services/auth.service';
import { ExperienciaClienteService, PeliculaVendida } from '../../core/services/experiencia-cliente.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [TarjetaPeliculaComponent, RouterLink],
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.css', './inicio-extras.component.css'],
})
export class InicioComponent implements OnInit, OnDestroy {
  private readonly peliculasService = inject(PeliculasService);
  private readonly reseniasService = inject(ReseniasService);
  private readonly auth = inject(AuthService);
  private readonly experiencia = inject(ExperienciaClienteService);
  private readonly router = inject(Router);
  readonly peliculas = signal<Pelicula[]>([]);
  readonly proximamente = signal<Pelicula[]>([]);
  readonly resumenesResenias = signal<Record<string, ResumenResenias>>({});
  readonly masVendidas = signal<PeliculaVendida[]>([]);
  readonly indiceRanking = signal(0);
  readonly peliculaRankingActual = computed(() => this.masVendidas()[this.indiceRanking()] ?? null);
  readonly alertasActivas = signal<Set<string>>(new Set());
  readonly mensajeAlerta = signal('');
  readonly busqueda = signal('');
  readonly generoSeleccionado = signal('');
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly resumenVacio: ResumenResenias = { promedio: 0, total: 0 };
  readonly generosDisponibles = GENEROS_PELICULA;
  private intervaloRanking?: ReturnType<typeof setInterval>;
  private destruido = false;
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


  // Consulta en paralelo el servicio de películas para cargar cartelera y próximos estrenos.
  async ngOnInit(): Promise<void> {
    try {
      const [cartelera, proximas] = await Promise.all([
        this.peliculasService.obtenerCartelera(),
        this.peliculasService.obtenerProximamente(),
      ]);
      
      // Guarda los resultados en las señales de cartelera y próximos estrenos.
      this.peliculas.set(cartelera);
      this.proximamente.set(proximas);

      try {
        this.masVendidas.set(await this.experiencia.obtenerMasVendidas());
        if (this.masVendidas().length > 1 && !this.destruido) {
          this.intervaloRanking = setInterval(() => this.cambiarRanking(1), 5000);
        }
      } catch { /* El resto de la cartelera debe seguir visible. */ }
      await this.auth.whenReady();
      if (this.auth.currentUser()) {
        try { this.alertasActivas.set(new Set((await this.experiencia.obtenerAlertasActivas()).map(a => a.peliculaId))); }
        catch { /* La cartelera no depende de las alertas. */ }
      }

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

  ngOnDestroy(): void {
    this.destruido = true;
    if (this.intervaloRanking) clearInterval(this.intervaloRanking);
  }

  async activarAlerta(peliculaId: string): Promise<void> {
    this.mensajeAlerta.set('');
    if (!this.auth.currentUser()) {
      await this.router.navigate(['/login'], { queryParams: { redirect: '/' } });
      return;
    }
    try {
      await this.experiencia.activarAlerta(peliculaId);
      this.alertasActivas.update(current => new Set([...current, peliculaId]));
      this.mensajeAlerta.set('Alerta activada. La vas a ver en Mis películas cuando haya funciones disponibles.');
    } catch (error) {
      this.mensajeAlerta.set(error instanceof Error ? error.message : 'No se pudo activar la alerta.');
    }
  }

  cambiarRanking(sentido: number): void {
    const total = this.masVendidas().length;
    if (total) this.indiceRanking.update(indice => (indice + sentido + total) % total);
  }

  private normalizar(valor: string): string {
    return valor
      .trim()
      .toLocaleLowerCase('es')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
}
