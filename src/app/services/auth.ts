import { Injectable, signal, computed } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import {
  LoginCredentials,
  RegisterCredentials,
  UserProfile,
  UserRole,
} from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private supabase: SupabaseClient;

  // Estado reactivo con Signals
  readonly currentUser = signal<User | null>(null);
  readonly currentProfile = signal<UserProfile | null>(null);
  readonly isLoading = signal<boolean>(false);

  // Señales derivadas (computed)
  readonly isLoggedIn = computed(() => !!this.currentUser());
  readonly userRole = computed<UserRole | null>(() => this.currentProfile()?.rol ?? null);
  readonly isAdmin = computed(() => this.userRole() === 'admin');
  readonly isEmpleado = computed(() => this.userRole() === 'empleado');
  readonly isCliente = computed(() => this.userRole() === 'cliente');

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );

    this.initAuth();
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
   * Carga el perfil del usuario desde la tabla 'profiles'
   */
  private async loadUserProfile(user: User): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
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
          rol: (data.rol as UserRole) ?? (user.user_metadata?.['rol'] as UserRole) ?? 'cliente',
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
          rol: (user.user_metadata?.['rol'] as UserRole) ?? 'cliente',
          saldoCredito: 0,
          puntosFidelidad: 0,
          primeraCompraUsada: false,
        });
      }
    } catch (err) {
      console.warn('Error al cargar perfil de tabla profiles:', err);
    }
  }

  /**
   * Iniciar sesión con email y contraseña
   */
  async login(credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> {
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
   * Registrar nuevo usuario y crear fila en 'profiles'
   */
  async register(credentials: RegisterCredentials): Promise<{ success: boolean; error?: string }> {
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
            rol: 'cliente',
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        this.currentUser.set(data.user);

        // Guardar en la tabla profiles
        const { error: profileError } = await this.supabase.from('profiles').upsert({
          id: data.user.id,
          email: credentials.email.trim(),
          nombre: credentials.nombre.trim(),
          apellido: credentials.apellido.trim(),
          fecha_nacimiento: credentials.fechaNacimiento,
          rol: 'cliente',
          saldo_credito: 0,
          puntos_fidelidad: 0,
          primera_compra_usada: false,
        });

        if (profileError) {
          console.warn('Advertencia al insertar en tabla profiles:', profileError);
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
