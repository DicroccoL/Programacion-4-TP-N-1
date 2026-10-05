import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { RolUsuario } from '../../../models/user.model';
import { SelectorFechaComponent } from '../../../shared/components/selector-fecha/selector-fecha.component';

@Component({
  selector: 'app-admin-usuarios', standalone: true, imports: [FormsModule, SelectorFechaComponent],
  template: `
    <section class="usuarios-admin"><header><h3>Usuarios y roles</h3><p>Creá cuentas de acceso para personal. La clave inicial se debe entregar al usuario por un canal seguro.</p></header>
      <form class="form-usuario" (ngSubmit)="crear()">
        <label>Nombre<input name="nombre" [(ngModel)]="nombre" required maxlength="80"></label>
        <label>Apellido<input name="apellido" [(ngModel)]="apellido" required maxlength="80"></label>
        <label>Correo<input name="email" type="email" [(ngModel)]="email" required autocomplete="email"></label>
        <label>Contraseña inicial<input name="password" type="password" [(ngModel)]="password" required minlength="8" autocomplete="new-password"></label>
        <label>Fecha de nacimiento<app-selector-fecha id="admin-fecha-nacimiento" name="fechaNacimiento" [(ngModel)]="fechaNacimiento" [bloqueado]="guardando()" /></label>
        <label>Tipo de sangre<select name="tipoSangre" [(ngModel)]="tipoSangre" required><option value="" disabled>Elegir</option>@for (tipo of tiposSangre; track tipo) {<option [value]="tipo">{{ tipo }}</option>}</select></label>
        <label>Color de ojos<input name="colorOjos" [(ngModel)]="colorOjos" required></label>
        <label>Días de vacaciones por año<input name="diasVacaciones" type="number" min="0" max="365" [(ngModel)]="diasVacaciones" required></label>
        <label>Rol<select name="rol" [(ngModel)]="rol"><option value="empleado">Empleado</option><option value="admin">Administrador</option></select></label>
        <button type="submit" [disabled]="guardando()">{{ guardando() ? 'Creando…' : 'Crear usuario' }}</button>
      </form>
      <p class="nota">Por seguridad, la creación usa una Supabase Edge Function con la clave de servidor. Esa clave nunca se incluye en Angular.</p>
      @if (mensaje()) {<p class="estado ok" role="status">{{ mensaje() }}</p>}
      @if (error()) {<p class="estado error" role="alert">{{ error() }}</p>}
    </section>
  `,
  styles: [`
    .usuarios-admin{display:grid;gap:1rem;color:var(--text-primary);max-width:850px}.usuarios-admin header p,.nota{color:var(--text-muted)}.form-usuario{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;padding:1.25rem;background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:var(--radius-md)}.form-usuario label{display:grid;gap:.4rem;color:var(--text-secondary);font-size:.85rem}.form-usuario input,.form-usuario select{padding:.7rem;background:var(--bg-input);border:1px solid var(--border-strong);border-radius:var(--radius-sm);color:var(--text-primary)}.form-usuario button{justify-self:start;align-self:end;padding:.75rem 1rem;border:0;border-radius:var(--radius-sm);background:var(--accent-crimson);font-weight:700;color:white;cursor:pointer}.form-usuario button:disabled{opacity:.6}.nota,.estado{font-size:.85rem}.ok{color:#6ee7b7}.error{color:#fda4af}
  `],
})
/** Solicita la creación de empleados o administradores mediante Edge Function. */
export class AdminUsuariosComponent {
  private readonly auth = inject(AuthService);
  nombre=''; apellido=''; email=''; password=''; fechaNacimiento=''; tipoSangre=''; colorOjos=''; diasVacaciones=0;
  readonly tiposSangre=['A+','A-','B+','B-','AB+','AB-','O+','O-'];
  rol: Exclude<RolUsuario,'cliente'>='empleado';
  readonly guardando=signal(false); readonly mensaje=signal(''); readonly error=signal('');
  async crear(): Promise<void> {
    this.guardando.set(true); this.mensaje.set(''); this.error.set('');
    try {
      const { data, error } = await this.auth.client.functions.invoke('crear-usuario-privilegiado', {
        body: { nombre:this.nombre.trim(), apellido:this.apellido.trim(), email:this.email.trim(), password:this.password, rol:this.rol,
          fechaNacimiento:this.fechaNacimiento, tipoSangre:this.tipoSangre, colorOjos:this.colorOjos.trim(), diasVacacionesAnio:Number(this.diasVacaciones) },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      this.mensaje.set(`Cuenta creada para ${this.email.trim()} con rol ${this.rol}.`);
      this.nombre=''; this.apellido=''; this.email=''; this.password=''; this.fechaNacimiento=''; this.tipoSangre=''; this.colorOjos=''; this.diasVacaciones=0; this.rol='empleado';
    } catch (e) { this.error.set(await this.detalleError(e)); }
    finally { this.guardando.set(false); }
  }

  private async detalleError(error: unknown): Promise<string> {
    const detalle = error as { message?: string; context?: unknown } | null;
    const contexto = detalle?.context;
    if (contexto instanceof Response) {
      try {
        const body = await contexto.clone().json() as { error?: string };
        if (body.error) return body.error;
      } catch { /* Respuesta sin JSON utilizable. */ }
    }
    const mensaje = detalle?.message ?? '';
    if (/database error saving new user/i.test(mensaje)) {
      return 'Supabase rechazó el alta al crear el perfil. Ejecutá supabase/sql/registro-usuarios.sql y revisá los logs de Auth.';
    }
    if (/function not found|could not find the function|failed to send a request|404/i.test(mensaje)) {
      return 'No está disponible la Edge Function crear-usuario-privilegiado. Desplegala desde la raíz del proyecto con: supabase functions deploy crear-usuario-privilegiado';
    }
    return mensaje || 'No se pudo crear el usuario. Revisá la configuración y los logs de la Edge Function.';
  }
}
