import { Directive, effect, inject, TemplateRef, ViewContainerRef } from '@angular/core';
import { AuthService } from '../services/auth.service';


//directiva que solo renderiza el elemento si el usuario es admin con un effect 
@Directive({
  selector: '[soloAdmin]',
  standalone: true,
})
export class SoloAdminDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly authService = inject(AuthService);
  private hasView = false;

  constructor() {
    effect(() => {
      const shouldShow = this.authService.isAdmin();

      if (shouldShow && !this.hasView) {
        this.viewContainer.createEmbeddedView(this.templateRef);
        this.hasView = true;
      } else if (!shouldShow && this.hasView) {
        this.viewContainer.clear();
        this.hasView = false;
      }
    });
  }
}
