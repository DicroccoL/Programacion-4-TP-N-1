import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ReseniasService } from '../../../core/services/resenias.service';
import { Resenia } from '../../../models/pelicula.model';
import { FechaArgentinaPipe } from '../../../shared/pipes/fecha-argentina.pipe';

@Component({
  selector: 'app-resenias-pelicula',
  standalone: true,
  imports: [DecimalPipe, FechaArgentinaPipe, FormsModule, RouterLink],
  templateUrl: './resenias-pelicula.component.html',
  styleUrl: './resenias-pelicula.component.css',
})
/** Lista reseñas y permite al usuario autenticado crear o editar la propia. */
export class ReseniasPeliculaComponent implements OnInit {
  readonly peliculaId = input.required<string>();
  readonly estrellas = [1, 2, 3, 4, 5];

  private readonly reseniasService = inject(ReseniasService);
  readonly authService = inject(AuthService);

  readonly resenias = signal<Resenia[]>([]);
  readonly puntaje = signal(0);
  readonly comentario = signal('');
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly error = signal('');
  readonly errorCarga = signal('');
  readonly mensaje = signal('');
  readonly promedio = computed(() => {
    const items = this.resenias();
    return items.length ? items.reduce((suma, item) => suma + item.puntaje, 0) / items.length : 0;
  });
  readonly reseniaPropia = computed(() => {
    const usuarioId = this.authService.currentUser()?.id;
    return usuarioId ? this.resenias().find((resenia) => resenia.usuarioId === usuarioId) : undefined;
  });

  async ngOnInit(): Promise<void> {
    try {
      await this.authService.whenReady();
      this.resenias.set(await this.reseniasService.obtenerPorPelicula(this.peliculaId()));
      this.cargarReseniaPropia();
    } catch {
      this.errorCarga.set('No se pudieron cargar las reseñas.');
    } finally {
      this.cargando.set(false);
    }
  }

  /** Guarda una puntuación de una a cinco estrellas en el formulario. */
  seleccionarPuntaje(puntaje: number): void {
    this.puntaje.set(puntaje);
    this.error.set('');
  }

  /** Guarda mediante upsert y recarga la lista para reflejar el promedio. */
  async guardar(): Promise<void> {
    const usuarioId = this.authService.currentUser()?.id;
    if (!usuarioId) return;
    if (this.puntaje() < 1 || this.puntaje() > 5) {
      this.error.set('Elegí una puntuación de 1 a 5 estrellas.');
      return;
    }

    this.guardando.set(true);
    this.error.set('');
    this.mensaje.set('');
    try {
      await this.reseniasService.guardar(
        this.peliculaId(),
        usuarioId,
        this.puntaje(),
        this.comentario(),
      );
      this.resenias.set(await this.reseniasService.obtenerPorPelicula(this.peliculaId()));
      this.cargarReseniaPropia();
      this.mensaje.set('Tu reseña se guardó correctamente.');
    } catch {
      this.error.set('No se pudo guardar la reseña. Revisá tu conexión e intentá nuevamente.');
    } finally {
      this.guardando.set(false);
    }
  }

  /** Copia al formulario la reseña existente del usuario actual. */
  private cargarReseniaPropia(): void {
    const propia = this.reseniaPropia();
    if (propia) {
      this.puntaje.set(propia.puntaje);
      this.comentario.set(propia.comentario ?? '');
    }
  }
}
