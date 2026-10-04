import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AuthService } from './auth.service';

const { supabaseMock } = vi.hoisted(() => ({
  supabaseMock: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(),
  },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => supabaseMock),
}));

describe('AuthService.register', () => {
  let service: AuthService;
  const credentials = {
    nombre: 'Ana', apellido: 'Pérez', email: 'ana@example.com', password: 'clave-segura',
    fechaNacimiento: '2000-05-10', tipoSangre: 'A+', colorOjos: 'Marrón', diasVacacionesAnio: 14,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: null } });
    supabaseMock.auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    TestBed.configureTestingModule({ providers: [AuthService] });
    service = TestBed.inject(AuthService);
    await service.whenReady();
  });

  it('envía los datos de registro como metadatos y deja el perfil al trigger de Supabase', async () => {
    const user = { id: 'user-1' };
    supabaseMock.auth.signUp.mockResolvedValue({ data: { user, session: null }, error: null });

    await expect(service.register(credentials)).resolves.toEqual({ success: true });
    expect(supabaseMock.auth.signUp).toHaveBeenCalledWith({
      email: 'ana@example.com',
      password: 'clave-segura',
      options: { data: {
        nombre: 'Ana', apellido: 'Pérez', fecha_nacimiento: '2000-05-10', tipo_sangre: 'A+',
        color_ojos: 'Marrón', dias_vacaciones_anio: 14, rol: 'cliente',
      } },
    });
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it('convierte el error genérico de Auth en pasos concretos para reparar el trigger', async () => {
    supabaseMock.auth.signUp.mockResolvedValue({
      data: { user: null, session: null }, error: { message: 'Database error saving new user', code: 'unexpected_failure' },
    });

    await expect(service.register(credentials)).resolves.toMatchObject({
      success: false,
      error: expect.stringContaining('supabase/sql/registro-usuarios.sql'),
    });
  });

  it('indica cuando el correo ya está registrado', async () => {
    supabaseMock.auth.signUp.mockResolvedValue({
      data: { user: null, session: null }, error: { message: 'User already registered', code: 'user_already_exists' },
    });

    await expect(service.register(credentials)).resolves.toEqual({
      success: false, error: 'Ya existe una cuenta registrada con ese correo. Iniciá sesión o usá otro correo.',
    });
  });
});
