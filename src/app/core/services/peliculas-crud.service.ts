import { Injectable, inject, signal } from '@angular/core';
import {
  CrearPeliculaDTO,
  EstadoPelicula,
  GeneroPelicula,
  GENEROS_PELICULA,
  Pelicula,
} from '../../models/pelicula.model';
import { PeliculasService } from './peliculas.service';

/**
 * Service centralizado para el CRUD de películas en el panel de administración.
 * Expone señales reactivas de estado (peliculas, cargando, error, mensaje)
 * que los componentes hijos consumen directamente mediante inyección,
 * eliminando la necesidad de pasar datos via @Input/@Output.
 */
@Injectable({ providedIn: 'root' })
export class PeliculasCrudService {
  private readonly peliculasService = inject(PeliculasService);

  // ─── Estado reactivo ────────────────────────────────────────────────────────
  readonly peliculas = signal<Pelicula[]>([]);
  readonly cargando  = signal(false);
  readonly guardando = signal(false);
  readonly mensaje   = signal('');
  readonly error     = signal('');

  // Estado de edición (null = modo creación)
  readonly peliculaEditandoId = signal<string | null>(null);
  readonly formulario = signal<CrearPeliculaDTO>(this.formularioVacio());
  readonly estados: EstadoPelicula[] = ['EN_CARTELERA', 'PROXIMAMENTE'];
  readonly generos = GENEROS_PELICULA;

  // ─── Carga ──────────────────────────────────────────────────────────────────
  async cargarPeliculas(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      this.peliculas.set(await this.peliculasService.obtenerTodas());
    } catch (e: unknown) {
      this.error.set(this.mensajeError(e, 'No se pudieron cargar las películas.'));
    } finally {
      this.cargando.set(false);
    }
  }

  // ─── Crear / Actualizar ─────────────────────────────────────────────────────
  async guardar(): Promise<boolean> {
    this.error.set('');
    this.mensaje.set('');

    const errorValidacion = this.validarFormulario();
    if (errorValidacion) {
      this.error.set(errorValidacion);
      return false;
    }

    this.guardando.set(true);
    try {
      const id = this.peliculaEditandoId();
      if (id) {
        await this.peliculasService.actualizar(id, this.formulario());
        this.mensaje.set('Película actualizada correctamente.');
      } else {
        await this.peliculasService.crear(this.formulario());
        this.mensaje.set('Película creada correctamente.');
      }
      this.limpiarEdicion();
      await this.cargarPeliculas();
      return true;
    } catch (e: unknown) {
      this.error.set(this.mensajeError(e, 'No se pudo guardar la película.'));
      return false;
    } finally {
      this.guardando.set(false);
    }
  }

  // ─── Eliminar ───────────────────────────────────────────────────────────────
  async eliminar(pelicula: Pelicula): Promise<void> {
    if (!confirm(`¿Querés eliminar "${pelicula.titulo}"?`)) return;
    this.error.set('');
    this.mensaje.set('');
    try {
      await this.peliculasService.eliminar(pelicula.id);
      this.mensaje.set('Película eliminada correctamente.');
      await this.cargarPeliculas();
    } catch (e: unknown) {
      this.error.set(this.mensajeError(e, 'No se pudo eliminar la película.'));
    }
  }

  // ─── Editar ─────────────────────────────────────────────────────────────────
  iniciarEdicion(pelicula: Pelicula): void {
    this.peliculaEditandoId.set(pelicula.id);
    this.formulario.set({
      titulo:          pelicula.titulo,
      genero:          this.generos.includes(pelicula.genero as GeneroPelicula)
        ? pelicula.genero
        : '',
      sinopsis:        pelicula.sinopsis,
      duracionMin:     pelicula.duracionMin,
      imagenUrl:       pelicula.imagenUrl,
      clasificacion:   pelicula.clasificacion,
      estado:          pelicula.estado,
      preventaActiva:  pelicula.preventaActiva,
      precioPreventa:  pelicula.precioPreventa ?? null,
      fechaEstreno:    pelicula.fechaEstreno ?? null,
    });
    this.mensaje.set('');
    this.error.set('');
  }

  limpiarEdicion(): void {
    this.peliculaEditandoId.set(null);
    this.formulario.set(this.formularioVacio());
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────
  private formularioVacio(): CrearPeliculaDTO {
    return {
      titulo: '', genero: '', sinopsis: '',
      duracionMin: 120, imagenUrl: '',
      clasificacion: 'ATP', estado: 'EN_CARTELERA',
      preventaActiva: false, precioPreventa: null, fechaEstreno: null,
    };
  }

  private validarFormulario(): string | null {
    const formulario = this.formulario();
    const textosObligatorios = [
      formulario.titulo,
      formulario.genero,
      formulario.sinopsis,
      formulario.imagenUrl,
    ];

    if (textosObligatorios.some((valor) => typeof valor !== 'string' || !valor.trim())) {
      return 'Completá el título, género, sinopsis y URL de imagen.';
    }
    if (!this.generos.includes(formulario.genero as GeneroPelicula)) {
      return 'Seleccioná uno de los géneros disponibles.';
    }

    const duracion = Number(formulario.duracionMin);
    if (!Number.isInteger(duracion) || duracion < 1) {
      return 'La duración debe ser un número entero mayor que cero.';
    }

    try {
      const url = new URL(formulario.imagenUrl.trim());
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return 'La URL de imagen debe comenzar con http:// o https://.';
      }
    } catch {
      return 'Ingresá una URL válida para la imagen.';
    }

    if (!['ATP', '+13', '+18'].includes(formulario.clasificacion)) {
      return 'Seleccioná una clasificación válida.';
    }
    if (!this.estados.includes(formulario.estado)) {
      return 'Seleccioná un estado válido para la película.';
    }
    return null;
  }

  private mensajeError(e: unknown, fallback: string): string {
    return e instanceof Error && e.message ? e.message : fallback;
  }
}
