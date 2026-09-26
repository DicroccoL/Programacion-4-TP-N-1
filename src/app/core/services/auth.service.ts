import { Injectable, signal, computed } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import {
  CredencialesLogin,
  CredencialesRegistro,
  PerfilUsuario,
  RolUsuario,
} from '../../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private supabase: SupabaseClient;
  private readonly authReady: Promise<void>;

  // Estado reactivo con Signals
  readonly currentUser = signal<User | null>(null);
  readonly currentProfile = signal<PerfilUsuario | null>(null);
  readonly isLoading = signal<boolean>(false);

  // Señales derivadas (computed)
  readonly isLoggedIn = computed(() => !!this.currentUser());
  readonly userRole = computed<RolUsuario | null>(() => this.currentProfile()?.rol ?? null);
  readonly isAdmin = computed(() => this.userRole() === 'admin');
  readonly isEmpleado = computed(() => this.userRole() === 'empleado');
  readonly isCliente = computed(() => this.userRole() === 'cliente');

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );

    this.authReady = this.initAuth();
  }

  async whenReady(): Promise<void> {
    await this.authReady;
  }

  get client(): SupabaseClient {
    return this.supabase;
  }

  private async initAuth(): Promise<void> {
    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      if (session?.user) {
        this.currentUser.set(session.user);
        await this.loadUserProfile(session.user);
      }
    } catch (error) {
      console.error('Error al inicializar sesión:', error);
    }

    this.supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;
      this.currentUser.set(user);

      if (user) {
        await this.loadUserProfile(user);
      } else {
        this.currentProfile.set(null);
      }
    });
  }

  /**
   * Carga el perfil del usuario desde la tabla 'perfiles'
   */
  private async loadUserProfile(user: User): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('perfiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (data && !error) {
        this.currentProfile.set({
          id: data.id,
          email: data.email ?? user.email ?? '',
          nombre: data.nombre ?? user.user_metadata?.['nombre'] ?? '',
          apellido: data.apellido ?? user.user_metadata?.['apellido'] ?? '',
          fechaNacimiento: data.fecha_nacimiento ?? user.user_metadata?.['fecha_nacimiento'] ?? '',
          tipoSangre: data.tipo_sangre ?? user.user_metadata?.['tipo_sangre'] ?? '',
          colorOjos: data.color_ojos ?? user.user_metadata?.['color_ojos'] ?? '',
          diasVacacionesAnio: Number(data.dias_vacaciones_anio ?? user.user_metadata?.['dias_vacaciones_anio'] ?? 0),
          rol: (data.rol as RolUsuario) ?? (user.user_metadata?.['rol'] as RolUsuario) ?? 'cliente',
          saldoCredito: Number(data.saldo_credito ?? 0),
          puntosFidelidad: Number(data.puntos_fidelidad ?? 0),
          primeraCompraUsada: Boolean(data.primera_compra_usada ?? false),
        });
      } else {
        this.currentProfile.set({
          id: user.id,
          email: user.email ?? '',
          nombre: user.user_metadata?.['nombre'] ?? '',
          apellido: user.user_metadata?.['apellido'] ?? '',
          fechaNacimiento: user.user_metadata?.['fecha_nacimiento'] ?? '',
          tipoSangre: user.user_metadata?.['tipo_sangre'] ?? '',
          colorOjos: user.user_metadata?.['color_ojos'] ?? '',
          diasVacacionesAnio: Number(user.user_metadata?.['dias_vacaciones_anio'] ?? 0),
          rol: (user.user_metadata?.['rol'] as RolUsuario) ?? 'cliente',
          saldoCredito: 0,
          puntosFidelidad: 0,
          primeraCompraUsada: false,
        });
      }
    } catch (err) {
      console.warn('Error al cargar perfil de tabla perfiles:', err);
    }
  }

  /**
   * Iniciar sesión con email y contraseña
   */
  async login(credentials: CredencialesLogin): Promise<{ success: boolean; error?: string }> {
    this.isLoading.set(true);
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: credentials.email.trim(),
        password: credentials.password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        this.currentUser.set(data.user);
        await this.loadUserProfile(data.user);
      }

      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión';
      return { success: false, error: message };
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Registrar nuevo usuario y crear fila en 'perfiles'
   */
  async register(credentials: CredencialesRegistro): Promise<{ success: boolean; error?: string }> {
    this.isLoading.set(true);
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email: credentials.email.trim(),
        password: credentials.password,
        options: {
          data: {
            nombre: credentials.nombre.trim(),
            apellido: credentials.apellido.trim(),
            fecha_nacimiento: credentials.fechaNacimiento,
            tipo_sangre: credentials.tipoSangre,
            color_ojos: credentials.colorOjos.trim(),
            dias_vacaciones_anio: credentials.diasVacacionesAnio,
            rol: 'cliente',
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        this.currentUser.set(data.user);


        const { error: profileError } = await this.supabase.from('perfiles').upsert({
          id: data.user.id,
          email: credentials.email.trim(),
          nombre: credentials.nombre.trim(),
          apellido: credentials.apellido.trim(),
          fecha_nacimiento: credentials.fechaNacimiento,
          tipo_sangre: credentials.tipoSangre,
          color_ojos: credentials.colorOjos.trim(),
          dias_vacaciones_anio: credentials.diasVacacionesAnio,
          rol: 'cliente',
          saldo_credito: 0,
          puntos_fidelidad: 0,
          primera_compra_usada: false,
        });

        if (profileError) {
          console.warn('Advertencia al insertar en tabla perfiles:', profileError);
        }

        await this.loadUserProfile(data.user);
      }

      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al registrar usuario';
      return { success: false, error: message };
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Cerrar sesión
   */
  async logout(): Promise<{ success: boolean; error?: string }> {
    this.isLoading.set(true);
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) {
        return { success: false, error: error.message };
      }
      this.currentUser.set(null);
      this.currentProfile.set(null);
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cerrar sesión';
      return { success: false, error: message };
    } finally {
      this.isLoading.set(false);
    }
  }
}
