import { Component, inject, OnInit, signal } from '@angular/core';
import { CrearPeliculaDTO, EstadoPelicula, Pelicula } from '../../models/pelicula.model';
import { PeliculasService } from '../../services/peliculas';
import { FormularioPeliculaComponent } from '../componente-formulario-pelicula/formulario-pelicula.component';
import { ListadoPeliculasComponent } from '../componente-listado-peliculas/listado-peliculas.component';

@Component({
  selector: 'app-admin-peliculas',
  standalone: true,
  imports: [FormularioPeliculaComponent, ListadoPeliculasComponent],
  templateUrl: './admin-peliculas.component.html',
  styleUrl: './admin-peliculas.component.css',
})
export class AdminPeliculasComponent implements OnInit {
  private readonly peliculasService = inject(PeliculasService);
  readonly peliculas = signal<Pelicula[]>([]);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly mensaje = signal('');
  readonly error = signal('');

  peliculaEditandoId: string | null = null;
  formulario: CrearPeliculaDTO = this.formularioVacio();
  readonly estados: EstadoPelicula[] = ['EN_CARTELERA', 'PROXIMAMENTE'];
  apartadoActivo: 'crear' | 'listar' = 'crear';

  async ngOnInit(): Promise<void> {
    await this.cargarPeliculas();
  }

  async cargarPeliculas(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');

    try {
      this.peliculas.set(await this.peliculasService.obtenerTodas());
    } catch (error: unknown) {
      this.error.set(this.obtenerMensajeError(error, 'No se pudieron cargar las películas.'));
    } finally {
      this.cargando.set(false);
    }
  }

  async guardarPelicula(): Promise<void> {
    this.guardando.set(true);
    this.error.set('');
    this.mensaje.set('');

    try {
      if (this.peliculaEditandoId) {
        await this.peliculasService.actualizar(this.peliculaEditandoId, this.formulario);
        this.mensaje.set('Película actualizada correctamente.');
      } else {
        await this.peliculasService.crear(this.formulario);
        this.mensaje.set('Película creada correctamente.');
      }

      this.cancelarEdicion();
      await this.cargarPeliculas();
    } catch (error: unknown) {
      this.error.set(this.obtenerMensajeError(error, 'No se pudo guardar la película.'));
    } finally {
      this.guardando.set(false);
    }
  }

  editarPelicula(pelicula: Pelicula): void {
    this.apartadoActivo = 'crear';
    this.peliculaEditandoId = pelicula.id;
    this.formulario = {
      titulo: pelicula.titulo,
      genero: pelicula.genero,
      sinopsis: pelicula.sinopsis,
      duracionMin: pelicula.duracionMin,
      imagenUrl: pelicula.imagenUrl,
      clasificacion: pelicula.clasificacion,
      estado: pelicula.estado,
      preventaActiva: pelicula.preventaActiva,
      precioPreventa: pelicula.precioPreventa ?? null,
      fechaEstreno: pelicula.fechaEstreno ?? null,
    };
    this.mensaje.set('');
    this.error.set('');
  }

  async eliminarPelicula(pelicula: Pelicula): Promise<void> {
    if (!confirm(`¿Querés eliminar "${pelicula.titulo}"?`)) {
      return;
    }

    this.error.set('');
    this.mensaje.set('');

    try {
      await this.peliculasService.eliminar(pelicula.id);
      this.mensaje.set('Película eliminada correctamente.');
      await this.cargarPeliculas();
    } catch (error: unknown) {
      this.error.set(this.obtenerMensajeError(error, 'No se pudo eliminar la película.'));
    }
  }

  cancelarEdicion(): void {
    this.peliculaEditandoId = null;
    this.formulario = this.formularioVacio();
  }

  seleccionarApartado(apartado: 'crear' | 'listar'): void {
    this.apartadoActivo = apartado;

    if (apartado === 'crear' && !this.peliculaEditandoId) {
      this.cancelarEdicion();
    }
  }

  private formularioVacio(): CrearPeliculaDTO {
    return {
      titulo: '',
      genero: '',
      sinopsis: '',
      duracionMin: 120,
      imagenUrl: '',
      clasificacion: 'ATP',
      estado: 'EN_CARTELERA',
      preventaActiva: false,
      precioPreventa: null,
      fechaEstreno: null,
    };
  }

  private obtenerMensajeError(error: unknown, mensajePredeterminado: string): string {
    return error instanceof Error && error.message ? error.message : mensajePredeterminado;
  }
}
