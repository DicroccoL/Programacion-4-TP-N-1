import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Pelicula } from '../../models/pelicula.model';
import { PeliculasService } from '../../core/services/peliculas.service';
import { FechaArgentinaPipe } from '../../shared/pipes/fecha-argentina.pipe';
import { ReseniasPeliculaComponent } from './resenias/resenias-pelicula.component';
import { SalasFuncionesService } from '../../core/services/salas-funciones.service';
import { Funcion } from '../../models/cine.model';

@Component({
  selector: 'app-detalle-pelicula',
  standalone: true,
  imports: [RouterLink, FechaArgentinaPipe, ReseniasPeliculaComponent],
  templateUrl: './detalle-pelicula.component.html',
  styleUrls: ['./detalle-pelicula.component.css', './funciones-selector.css'],
})
export class DetallePeliculaComponent implements OnInit {
  private readonly ruta = inject(ActivatedRoute);
  private readonly peliculasService = inject(PeliculasService);
  private readonly programacionService = inject(SalasFuncionesService);
  private readonly router = inject(Router);

  readonly pelicula = signal<Pelicula | null>(null);
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly funciones = signal<Funcion[]>([]);
  readonly errorFunciones = signal('');
  readonly funcionSeleccionada = signal('');
  readonly puedeComprar = computed(() => {
    const pelicula = this.pelicula();
    return !!pelicula && (pelicula.estado === 'EN_CARTELERA' || pelicula.preventaActiva);
  });

  async ngOnInit(): Promise<void> {
    const id = this.ruta.snapshot.paramMap.get('id');

    if (!id) {
      this.error.set('No se encontró la película solicitada.');
      this.cargando.set(false);
      return;
    }

    try {
      this.pelicula.set(await this.peliculasService.obtenerPorId(id));
      try { this.funciones.set(await this.programacionService.listarFunciones(id)); }
      catch { this.errorFunciones.set('No se pudieron cargar las funciones. Verificá que la configuración SQL de salas y funciones esté aplicada.'); }
    } catch {
      this.error.set('No se pudo cargar el detalle de la película.');
    } finally {
      this.cargando.set(false);
    }
  }

  irAButacas(): void {
    const id = this.funcionSeleccionada();
    if (id) void this.router.navigate(['/funciones', id, 'butacas']);
  }

  diaSemanaFuncion(funcion: Funcion): string {
    return new Intl.DateTimeFormat('es-AR', {
      weekday: 'short', timeZone: 'America/Argentina/Buenos_Aires',
    }).format(new Date(funcion.fechaHoraInicio)).replace('.', '');
  }

  diaNumeroFuncion(funcion: Funcion): string {
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit', timeZone: 'America/Argentina/Buenos_Aires',
    }).format(new Date(funcion.fechaHoraInicio));
  }

  horaFuncion(funcion: Funcion): string {
    return new Intl.DateTimeFormat('es-AR', {
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'America/Argentina/Buenos_Aires',
    }).format(new Date(funcion.fechaHoraInicio));
  }
}
