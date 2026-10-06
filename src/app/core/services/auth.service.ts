import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { PerfilService } from './perfil.service';
import { SesionService } from './sesion.service';
import {
  CredencialesLogin,
  CredencialesRegistro,
  RolUsuario,
} from '../../models/user.model';

/** Coordina autenticación, perfil y duración de sesión.
 * Los componentes y guards siguen usando este servicio como punto de entrada.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly perfiles = inject(PerfilService);
  private readonly sesiones = inject(SesionService);
  private readonly router = inject(Router);
  private readonly supabase: SupabaseClient;
  private readonly authReady: Promise<void>;

  // Usuario de Supabase y estado de las operaciones de login/registro/logout.
  readonly currentUser = signal<User | null>(null);
  readonly isLoading = signal(false);
  // Es la misma señal que actualiza PerfilService, no una copia del perfil.
  readonly currentProfile = this.perfiles.currentProfile;

  // Los guards y el menú consultan estas señales para decidir el acceso y la visibilidad.
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

    // Entregamos funciones a SesionService para que no necesite inyectar AuthService.
    // Así evitamos una dependencia circular entre ambos servicios.
    this.sesiones.configurar(
      () => this.currentUser()?.id ?? null,
      () => this.cerrarSesionLocal(),
    );
    this.authReady = this.initAuth();
  }

  /**
   * Espera a que la inicialización de sesión termine.
   * Se usa para asegurar que el estado de auth está listo antes de navegar.
   */
  async whenReady(): Promise<void> {
    await this.authReady;
    await this.sesiones.verificar();
  }

  /** Recarga el perfil después de operaciones que modifican saldo o puntos. */
  async refreshCurrentProfile(): Promise<void> {
    const user = this.currentUser();
    if (user) await this.perfiles.cargar(this.supabase, user);
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
        if (!this.sesiones.recuperar(session.user.id)) {
          // Una sesión vencida o sin marca de inicio debe cerrarse.
          await this.sesiones.cerrar();
        } else {
          this.currentUser.set(session.user);
          await this.perfiles.cargar(this.supabase, session.user);
        }
      } else {
        this.sesiones.limpiar();
      }
    } catch (error) {
      console.error('Error al inicializar sesión:', error);
    }

    this.supabase.auth.onAuthStateChange(async (event, session) => {
      const user = session?.user ?? null;
      this.currentUser.set(user);

      if (user) {
        if (!this.sesiones.recuperar(user.id, event === 'SIGNED_IN')) {
          // Diferimos el cierre para no llamar a Auth dentro de su propio callback.
          setTimeout(() => void this.sesiones.cerrar(), 0);
          return;
        }
        await this.perfiles.cargar(this.supabase, user);
      } else {
        this.sesiones.limpiar();
        this.perfiles.limpiar();
      }
    });
  }

  /**
   * Recibe email y contraseña; inicia sesión, programa el plazo y carga el perfil.
   * Devuelve success y, si falla, un mensaje de error para el formulario.
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
        this.sesiones.iniciar(data.user.id);
        this.currentUser.set(data.user);
        await this.perfiles.cargar(this.supabase, data.user);
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
   * Recibe los datos del formulario y registra un cliente.
   * El trigger de Supabase crea su fila en 'perfiles'; devuelve success/error.
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
        this.sesiones.iniciar(data.user.id);
        this.currentUser.set(data.user);
        await this.perfiles.cargar(this.supabase, data.user);
      }

      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al registrar usuario';
      return { success: false, error: message };
    } finally {
      this.isLoading.set(false);
    }
  }

  /** Recibe un error de Supabase y devuelve un mensaje para mostrar en el registro. */
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
   * Cierra sesión en Supabase y limpia usuario, perfil y reloj.
   * Devuelve success/error para que el componente conozca el resultado.
   */
  async logout(): Promise<{ success: boolean; error?: string }> {
    this.isLoading.set(true);
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) {
        return { success: false, error: error.message };
      }
      this.currentUser.set(null);
      this.perfiles.limpiar();
      this.sesiones.limpiar();
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cerrar sesión';
      return { success: false, error: message };
    } finally {
      this.isLoading.set(false);
    }
  }

  /** SesionService pide este cierre local cuando vence el plazo.
   * Supabase cierra la sesión de este navegador, limpiamos el estado y vamos al inicio.
   */
  private async cerrarSesionLocal(): Promise<void> {
    try {
      const { error } = await this.supabase.auth.signOut({ scope: 'local' });
      if (error) console.error('No se pudo cerrar la sesión vencida:', error);
    } finally {
      this.currentUser.set(null);
      this.perfiles.limpiar();
      // Al vencer, salimos de la pantalla abierta sin esperar otra navegación.
      await this.router.navigate(['/']);
    }
  }
}
