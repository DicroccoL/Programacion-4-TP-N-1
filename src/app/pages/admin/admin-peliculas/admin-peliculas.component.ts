import { Component, inject, OnInit, signal } from '@angular/core';
import { PeliculasCrudService } from '../../../core/services/peliculas-crud.service';
import { FormularioPeliculaComponent } from './formulario-pelicula/formulario-pelicula.component';
import { ListadoPeliculasComponent } from './listado-peliculas/listado-peliculas.component';
import { AdminPeliculasTabsComponent } from './admin-peliculas-tabs/admin-peliculas-tabs.component';

@Component({
  selector: 'app-admin-peliculas',
  standalone: true,
  imports: [FormularioPeliculaComponent, ListadoPeliculasComponent, AdminPeliculasTabsComponent],
  templateUrl: './admin-peliculas.component.html',
  styleUrl: './admin-peliculas.component.css',
})
export class AdminPeliculasComponent implements OnInit {
  private readonly crud = inject(PeliculasCrudService);

  /** Solo gestiona qué pestaña está visible. Toda la lógica CRUD vive en el service. */
  readonly apartadoActivo = signal<'crear' | 'listar'>('crear');

  async ngOnInit(): Promise<void> {
    await this.crud.cargarPeliculas();
  }

  seleccionarApartado(apartado: 'crear' | 'listar'): void {
    this.apartadoActivo.set(apartado);
    // Al volver a "crear" sin estar editando, limpia el formulario
    if (apartado === 'crear' && !this.crud.peliculaEditandoId()) {
      this.crud.limpiarEdicion();
    }
  }

  /** Llamado por formulario cuando guarda con éxito → vuelve al listado */
  irAlListado(): void {
    this.apartadoActivo.set('listar');
  }

  /** Llamado por listado cuando pide editar → cambia a pestaña crear */
  irAlFormulario(): void {
    this.apartadoActivo.set('crear');
  }
}

