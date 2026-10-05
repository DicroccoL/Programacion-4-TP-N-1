import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-admin-peliculas-tabs',
  standalone: true,
  imports: [],
  template: `
    <nav class="crud-navegacion" aria-label="Apartados del CRUD de películas" role="tablist">
      <button
        type="button"
        role="tab"
        [attr.aria-selected]="active === 'crear'"
        [class.activo]="active === 'crear'"
        (click)="tabClicked('crear')"
      >
        Crear película
      </button>
      <button
        type="button"
        role="tab"
        [attr.aria-selected]="active === 'listar'"
        [class.activo]="active === 'listar'"
        (click)="tabClicked('listar')"
      >
        Películas cargadas
      </button>
    </nav>
  `,
  styleUrls: ['./admin-peliculas-tabs.component.css']
})
/** Mantiene la pestaña activa del módulo administrativo de películas. */
export class AdminPeliculasTabsComponent {
  @Input() active: 'crear' | 'listar' = 'crear';
  @Output() change = new EventEmitter<'crear' | 'listar'>();

  tabClicked(tab: 'crear' | 'listar'): void {
    if (tab !== this.active) {
      this.change.emit(tab);
    }
  }
}
