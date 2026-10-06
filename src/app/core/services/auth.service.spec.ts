import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { User } from '@supabase/supabase-js';
import { AuthService } from './auth.service';
import { PerfilService } from './perfil.service';
import { SesionService } from './sesion.service';
import { authGuard } from '../guards/auth.guard';
import { adminGuard } from '../guards/admin.guard';
import { staffGuard } from '../guards/staff.guard';
import { AppLayoutComponent } from '../../layout/app-layout.component';

const sdk = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: sdk.createClient }));

describe('AuthService integrado con PerfilService, SesionService, guards y menú', () => {
  const clave = 'wildecinemas.session.startedAt';
  const user = { id: 'u1', email: 'ana@cine.test', user_metadata: { nombre: 'Ana', rol: 'cliente' } } as unknown as User;
  const credenciales = { email: ' ana@cine.test ', password: ' clave123 ' };
  const registro = { ...credenciales, nombre: ' Ana ', apellido: ' Paz ', fechaNacimiento: '1970-01-01', tipoSangre: 'A+', colorOjos: ' Marrón ', diasVacacionesAnio: 14 };
  let client: any;
  let perfil: ReturnType<typeof vi.fn>;
  let cambio: (event: string, session: { user: User } | null) => unknown;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-06T12:00:00Z'));
    localStorage.clear();
    vi.spyOn(document, 'addEventListener').mockImplementation(() => {});
    perfil = vi.fn().mockResolvedValue({ data: { id: 'u1', nombre: 'Ana', rol: 'cliente', puntos_fidelidad: 10 }, error: null });
    client = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: vi.fn().mockImplementation((callback) => { cambio = callback; }),
        signInWithPassword: vi.fn().mockResolvedValue({ data: { user }, error: null }),
        signUp: vi.fn().mockResolvedValue({ data: { user, session: { user } }, error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
      from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: perfil }),
    };
    sdk.createClient.mockReturnValue(client);
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });
  afterEach(() => {
    TestBed.inject(SesionService).limpiar();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
  async function obtenerAuth(): Promise<AuthService> {
    const auth = TestBed.inject(AuthService);
    await auth.whenReady();
    return auth;
  }

  it('crea una sola conexión y comparte la misma señal de perfil', async () => {
    const auth = await obtenerAuth();
    expect(sdk.createClient).toHaveBeenCalled();
    expect(auth.client).toBe(client);
    expect(auth.currentProfile).toBe(TestBed.inject(PerfilService).currentProfile);
    expect(auth.isLoggedIn()).toBe(false);
  });

  it('login mantiene contraseña, limpia correo, carga perfil y programa vencimiento', async () => {
    const auth = await obtenerAuth();
    expect(await auth.login(credenciales)).toEqual({ success: true });
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'ana@cine.test', password: ' clave123 ' });
    expect(auth.currentUser()).toBe(user);
    expect(auth.currentProfile()?.puntosFidelidad).toBe(10);
    expect(auth.isCliente()).toBe(true);
    expect(auth.isLoading()).toBe(false);
    expect(JSON.parse(localStorage.getItem(clave)!)).toEqual({ userId: 'u1', inicio: Date.now() });
  });

  it.each(['respuesta', 'excepción'])('login fallido por %s devuelve error y finaliza loading', async (caso) => {
    const auth = await obtenerAuth();
    if (caso === 'respuesta') client.auth.signInWithPassword.mockResolvedValue({ data: {}, error: { message: 'Credenciales inválidas' } });
    else client.auth.signInWithPassword.mockRejectedValue(new Error('Credenciales inválidas'));
    expect(await auth.login(credenciales)).toEqual({ success: false, error: 'Credenciales inválidas' });
    expect(auth.isLoading()).toBe(false);
    expect(auth.currentUser()).toBeNull();
    expect(localStorage.getItem(clave)).toBeNull();
  });

  it('registro envía metadata de cliente y carga la sesión inmediata', async () => {
    const auth = await obtenerAuth();
    expect(await auth.register(registro)).toEqual({ success: true });
    expect(client.auth.signUp).toHaveBeenCalledWith({ email: 'ana@cine.test', password: ' clave123 ', options: { data: { nombre: 'Ana', apellido: 'Paz', fecha_nacimiento: '1970-01-01', tipo_sangre: 'A+', color_ojos: 'Marrón', dias_vacaciones_anio: 14, rol: 'cliente' } } });
    expect(auth.isLoggedIn()).toBe(true);
    expect(auth.isLoading()).toBe(false);
  });

  it('registro con confirmación pendiente no crea sesión ni consulta perfil', async () => {
    const auth = await obtenerAuth();
    client.auth.signUp.mockResolvedValue({ data: { user, session: null }, error: null });
    expect(await auth.register(registro)).toEqual({ success: true });
    expect(auth.currentUser()).toBeNull();
    expect(perfil).not.toHaveBeenCalled();
    expect(localStorage.getItem(clave)).toBeNull();
  });

  it('registro traduce el error de correo duplicado', async () => {
    const auth = await obtenerAuth();
    client.auth.signUp.mockResolvedValue({ data: {}, error: { code: '23505', message: 'already registered' } });
    expect((await auth.register(registro)).error).toContain('Ya existe una cuenta');
    expect(auth.isLoading()).toBe(false);
  });

  it('registro captura una excepción de red', async () => {
    const auth = await obtenerAuth();
    client.auth.signUp.mockRejectedValue(new Error('Sin conexión'));
    expect(await auth.register(registro)).toEqual({ success: false, error: 'Sin conexión' });
    expect(auth.isLoading()).toBe(false);
  });

  it('logout limpia sesión, perfil, roles y temporizador', async () => {
    const auth = await obtenerAuth();
    await auth.login(credenciales);
    expect(await auth.logout()).toEqual({ success: true });
    expect(auth.currentUser()).toBeNull();
    expect(auth.currentProfile()).toBeNull();
    expect(auth.userRole()).toBeNull();
    expect(localStorage.getItem(clave)).toBeNull();
    await vi.advanceTimersByTimeAsync(420000);
    expect(client.auth.signOut).toHaveBeenCalledTimes(1);
  });

  it.each(['respuesta', 'excepción'])('logout fallido por %s informa el error', async (caso) => {
    const auth = await obtenerAuth();
    await auth.login(credenciales);
    if (caso === 'respuesta') client.auth.signOut.mockResolvedValue({ error: { message: 'Sin conexión' } });
    else client.auth.signOut.mockRejectedValue(new Error('Sin conexión'));
    expect(await auth.logout()).toEqual({ success: false, error: 'Sin conexión' });
    expect(auth.isLoading()).toBe(false);
    expect(auth.currentUser()).toBe(user);
  });

  it('recupera usuario y rol al actualizar sin reiniciar la antigüedad', async () => {
    const inicio = Date.now() - 360000;
    localStorage.setItem(clave, JSON.stringify({ userId: 'u1', inicio }));
    client.auth.getSession.mockResolvedValue({ data: { session: { user } } });
    perfil.mockResolvedValue({ data: { id: 'u1', rol: 'admin' }, error: null });
    const auth = await obtenerAuth();
    expect(auth.isAdmin()).toBe(true);
    expect(JSON.parse(localStorage.getItem(clave)!).inicio).toBe(inicio);
    await vi.advanceTimersByTimeAsync(60000);
    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(auth.currentUser()).toBeNull();
    expect(auth.currentProfile()).toBeNull();
  });

  it.each(['vencida', 'sin marca'])('cierra una sesión recuperada %s', async (caso) => {
    if (caso === 'vencida') localStorage.setItem(clave, JSON.stringify({ userId: 'u1', inicio: Date.now() - 420000 }));
    client.auth.getSession.mockResolvedValue({ data: { session: { user } } });
    const auth = await obtenerAuth();
    expect(auth.currentUser()).toBeNull();
    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(perfil).not.toHaveBeenCalled();
  });

  it('renovar el token no extiende los siete minutos', async () => {
    const auth = await obtenerAuth();
    await auth.login(credenciales);
    const marca = localStorage.getItem(clave);
    await vi.advanceTimersByTimeAsync(240000);
    await cambio('TOKEN_REFRESHED', { user });
    expect(localStorage.getItem(clave)).toBe(marca);
    await vi.advanceTimersByTimeAsync(180000);
    expect(auth.isLoggedIn()).toBe(false);
    expect(auth.isAdmin()).toBe(false);
  });

  it('SIGNED_OUT limpia usuario y perfil', async () => {
    const auth = await obtenerAuth();
    await auth.login(credenciales);
    await cambio('SIGNED_OUT', null);
    expect(auth.currentUser()).toBeNull();
    expect(auth.currentProfile()).toBeNull();
    expect(localStorage.getItem(clave)).toBeNull();
  });

  it('SIGNED_IN crea la marca y carga el perfil cuando llega desde Supabase', async () => {
    const auth = await obtenerAuth();
    await cambio('SIGNED_IN', { user });
    expect(auth.currentUser()).toBe(user);
    expect(auth.currentProfile()?.nombre).toBe('Ana');
    expect(localStorage.getItem(clave)).not.toBeNull();
  });

  it('whenReady detecta el vencimiento aunque no se haya ejecutado el temporizador', async () => {
    const auth = await obtenerAuth();
    await auth.login(credenciales);
    vi.setSystemTime(Date.now() + 420000);
    await auth.whenReady();
    expect(auth.currentUser()).toBeNull();
    expect(auth.currentProfile()).toBeNull();
    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('al vencer redirige automáticamente al inicio después de limpiar usuario y perfil', async () => {
    const auth = await obtenerAuth();
    const router = TestBed.inject(Router);
    vi.mocked(router.navigate).mockImplementation(async () => {
      expect(auth.currentUser()).toBeNull();
      expect(auth.currentProfile()).toBeNull();
      return true;
    });
    await auth.login(credenciales);
    await vi.advanceTimersByTimeAsync(420000);
    expect(router.navigate).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('un fallo al cerrar por vencimiento no conserva el estado visual', async () => {
    const aviso = vi.spyOn(console, 'error').mockImplementation(() => {});
    const auth = await obtenerAuth();
    await auth.login(credenciales);
    client.auth.signOut.mockResolvedValue({ error: { message: 'Sin conexión' } });
    await vi.advanceTimersByTimeAsync(420000);
    expect(auth.currentUser()).toBeNull();
    expect(auth.currentProfile()).toBeNull();
    expect(localStorage.getItem(clave)).toBeNull();
    expect(aviso).toHaveBeenCalled();
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/']);
  });

  it('mantiene loading mientras el login está pendiente', async () => {
    const auth = await obtenerAuth();
    let resolver!: (value: unknown) => void;
    client.auth.signInWithPassword.mockImplementation(() => new Promise((resolve) => { resolver = resolve; }));
    const pendiente = auth.login(credenciales);
    expect(auth.isLoading()).toBe(true);
    resolver({ data: { user }, error: null });
    await pendiente;
    expect(auth.isLoading()).toBe(false);
  });

  it('recarga puntos y crédito usando el mismo cliente', async () => {
    const auth = await obtenerAuth();
    await auth.login(credenciales);
    perfil.mockResolvedValue({ data: { id: 'u1', rol: 'cliente', puntos_fidelidad: 99, saldo_credito: 500 }, error: null });
    await auth.refreshCurrentProfile();
    expect(auth.currentProfile()).toMatchObject({ puntosFidelidad: 99, saldoCredito: 500 });
  });

  it('no consulta perfiles al recargar sin sesión', async () => {
    const auth = await obtenerAuth();
    await auth.refreshCurrentProfile();
    expect(perfil).not.toHaveBeenCalled();
  });

  it.each(['admin', 'empleado', 'cliente', 'visitante'])(
    'guards y enlaces del menú responden al rol %s', async (rol) => {
      const auth = await obtenerAuth();
      if (rol !== 'visitante') {
        perfil.mockResolvedValue({ data: { id: 'u1', rol }, error: null });
        await auth.login(credenciales);
      }
      const route = {} as ActivatedRouteSnapshot;
      const state = { url: '/mis-peliculas' } as RouterStateSnapshot;
      const resultadoAuth = await TestBed.runInInjectionContext(() => authGuard(route, state));
      const resultadoAdmin = await TestBed.runInInjectionContext(() => adminGuard(route, state));
      const resultadoStaff = await TestBed.runInInjectionContext(() => staffGuard(route, state));
      const router = TestBed.inject(Router);
      const destino = (resultado: unknown) => resultado instanceof UrlTree ? router.serializeUrl(resultado) : resultado;
      expect(destino(resultadoAuth)).toBe(rol === 'visitante' ? '/login?redirect=%2Fmis-peliculas' : true);
      expect(destino(resultadoAdmin)).toBe(rol === 'admin' ? true : '/');
      expect(destino(resultadoStaff)).toBe(['admin', 'empleado'].includes(rol) ? true : rol === 'visitante' ? '/login' : '/');

      const fixture = TestBed.createComponent(AppLayoutComponent);
      fixture.detectChanges();
      const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('nav a')).map((a) => a.textContent?.trim());
      expect(links.includes('Panel de Control')).toBe(rol === 'admin');
      expect(links.includes('Validar QR')).toBe(['admin', 'empleado'].includes(rol));
      expect(links.includes('Mis películas')).toBe(rol !== 'visitante');
      fixture.destroy();
    },
  );
});
