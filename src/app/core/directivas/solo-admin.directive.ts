import { Directive, effect, inject, TemplateRef, ViewContainerRef } from '@angular/core';
import { AuthService } from '../services/auth.service';
// Directiva estructural: muestra el elemento solo si el usuario es administrador.
// Se usa en el HTML como *soloAdmin, por ejemplo en el enlace al Panel de Control.
@Directive({
  selector: '[soloAdmin]',
  standalone: true,
})
export class SoloAdminDirective {
  // Plantilla del elemento que queremos mostrar.
  private readonly templateRef = inject(TemplateRef<unknown>);
  // Lugar donde Angular agrega o elimina el elemento.
  private readonly viewContainer = inject(ViewContainerRef);
  // Servicio que nos permite consultar el rol del usuario.
  private readonly authService = inject(AuthService);
  // Indica si el elemento ya fue creado, para no duplicarlo.
  private hasView = false;

  constructor() {
    // Se vuelve a ejecutar cuando cambia el valor de isAdmin.
    effect(() => {
      const shouldShow = this.authService.isAdmin();

      if (shouldShow && !this.hasView) {
        // Si es administrador, mostramos el elemento.
        this.viewContainer.createEmbeddedView(this.templateRef);
        this.hasView = true;
      } else if (!shouldShow && this.hasView) {
        // Si ya no es administrador, quitamos el elemento de la vista.
        this.viewContainer.clear();
        this.hasView = false;
      }
    });
  }
}
