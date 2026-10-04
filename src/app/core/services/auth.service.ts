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
/**
 * Servicio central de autenticación y sesión del usuario.
 *
 * Se encarga de conectarse con Supabase Auth, mantener el usuario actual,
 * cargar su perfil y exponer estados reactivos para que la UI pueda decidir
 * si mostrar login, admin, empleado o cliente.
 *
 * Se usa desde:
 * - formularios de login/registro
 * - guards de rutas protegidas
 * - componentes del admin para validar roles
 * - cualquier pantalla que necesite saber si el usuario está autenticado
 */
export class AuthService {
  private supabase: SupabaseClient;
  private readonly authReady: Promise<void>;

  // Estado reactivo con Signals
  /**
   * Usuario autenticado de Supabase Auth.
   */
  readonly currentUser = signal<User | null>(null);

  /**
   * Perfil del usuario cargado desde la tabla `perfiles`.
   */
  readonly currentProfile = signal<PerfilUsuario | null>(null);

  /**
   * Indica si hay una operación de autenticación en curso.
   */
  readonly isLoading = signal<boolean>(false);

  // Señales derivadas (computed)
  /**
   * Verdadero si el usuario está logueado.
   */
  readonly isLoggedIn = computed(() => !!this.currentUser());

  /**
   * Rol del usuario actual.
   */
  readonly userRole = computed<RolUsuario | null>(() => this.currentProfile()?.rol ?? null);

  /**
   * Verdadero cuando el perfil del usuario es admin.
   */
  readonly isAdmin = computed(() => this.userRole() === 'admin');

  /**
   * Verdadero cuando el perfil del usuario es empleado.
   */
  readonly isEmpleado = computed(() => this.userRole() === 'empleado');

  /**
   * Verdadero cuando el perfil del usuario es cliente.
   */
  readonly isCliente = computed(() => this.userRole() === 'cliente');

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );

    this.authReady = this.initAuth();
  }

  /**
   * Espera a que la inicialización de sesión termine.
   * Se usa para asegurar que el estado de auth está listo antes de navegar.
   */
  async whenReady(): Promise<void> {
    await this.authReady;
  }

  /** Recarga el perfil después de operaciones que modifican saldo o puntos. */
  async refreshCurrentProfile(): Promise<void> {
    const user = this.currentUser();
    if (user) await this.loadUserProfile(user);
  }

  /**
   * Cliente de Supabase disponible para otras capas que necesiten acceso directo.
   */
  get client(): SupabaseClient {
    return this.supabase;
  }

  /**
   * Inicializa la sesión existente y registra un listener para cambios de auth.
   */
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
   * Carga el perfil del usuario desde la tabla `perfiles`.
   * Permite conocer nombre, rol, puntos, etc., sin duplicar lógica en cada pantalla.
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
   * Registrar cliente; el trigger de Supabase crea su fila en 'perfiles'.
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
        return { success: false, error: this.mensajeErrorRegistro(error) };
      }

      // El trigger seguro de auth.users crea el perfil dentro de la transacción
      // del registro. Evitamos el upsert desde el navegador: con confirmación de
      // correo todavía no hay sesión y RLS debe impedir esa escritura anónima.
      if (data.user && data.session) {
        this.currentUser.set(data.user);
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

  private mensajeErrorRegistro(error: { message?: string; code?: string }): string {
    const message = error.message ?? 'No se pudo crear la cuenta.';
    if (/database error saving new user/i.test(message)) {
      return 'Supabase no pudo crear el perfil asociado a la cuenta. Ejecutá supabase/sql/registro-usuarios.sql en el SQL Editor y revisá los logs de Auth si el problema continúa.';
    }
    if (error.code === '23505' || /already registered|already exists/i.test(message)) {
      return 'Ya existe una cuenta registrada con ese correo. Iniciá sesión o usá otro correo.';
    }
    return message;
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
