import { Injectable, signal } from '@angular/core';
import { SupabaseClient, User } from '@supabase/supabase-js';
import { PerfilUsuario, RolUsuario } from '../../models/user.model';

/** Obtiene el perfil y adapta sus campos al modelo que usa Angular. */
@Injectable({ providedIn: 'root' })
export class PerfilService {
  // AuthService expone esta misma señal a los componentes y guards.
  readonly currentProfile = signal<PerfilUsuario | null>(null);
  // Identifica la última consulta; limpiar invalida las respuestas pendientes.
  private versionConsulta = 0;

  /** Recibe la conexión y el usuario; consulta su perfil y actualiza la señal. */
  async cargar(client: SupabaseClient, user: User): Promise<void> {
    const version = ++this.versionConsulta;
    try {
      const { data, error } = await client
        .from('perfiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      // Un logout o una consulta más nueva hace que esta respuesta ya no corresponda.
      if (version !== this.versionConsulta) return;

      // Si no se pudo obtener la fila, usamos los datos de la cuenta como respaldo.
      const fila = data && !error ? data : null;
      const metadata = user.user_metadata;
      this.currentProfile.set({
        id: fila?.id ?? user.id,
        email: fila?.email ?? user.email ?? '',
        nombre: fila?.nombre ?? metadata?.['nombre'] ?? '',
        apellido: fila?.apellido ?? metadata?.['apellido'] ?? '',
        fechaNacimiento: fila?.fecha_nacimiento ?? metadata?.['fecha_nacimiento'] ?? '',
        tipoSangre: fila?.tipo_sangre ?? metadata?.['tipo_sangre'] ?? '',
        colorOjos: fila?.color_ojos ?? metadata?.['color_ojos'] ?? '',
        diasVacacionesAnio: Number(fila?.dias_vacaciones_anio ?? metadata?.['dias_vacaciones_anio'] ?? 0),
        rol: (fila?.rol as RolUsuario) ?? (metadata?.['rol'] as RolUsuario) ?? 'cliente',
        saldoCredito: Number(fila?.saldo_credito ?? 0),
        puntosFidelidad: Number(fila?.puntos_fidelidad ?? 0),
        primeraCompraUsada: Boolean(fila?.primera_compra_usada ?? false),
      });
    } catch (error) {
      console.warn('Error al cargar perfil de tabla perfiles:', error);
    }
  }

  /** Borra el perfil de la pantalla cuando se cierra la sesión. */
  limpiar(): void {
    this.versionConsulta++;
    this.currentProfile.set(null);
  }
}
