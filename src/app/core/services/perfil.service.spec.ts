import { SupabaseClient, User } from '@supabase/supabase-js';
import { PerfilService } from './perfil.service';

describe('PerfilService', () => {
  let servicio: PerfilService;
  let respuesta: ReturnType<typeof vi.fn>;
  let client: SupabaseClient;
  const user = { id: 'u1', email: 'cuenta@cine.test', user_metadata: { nombre: 'Ana', apellido: 'Paz', rol: 'cliente' } } as unknown as User;
  beforeEach(() => {
    servicio = new PerfilService();
    respuesta = vi.fn().mockResolvedValue({ data: null, error: null });
    const consulta = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: respuesta };
    client = { from: vi.fn().mockReturnValue(consulta) } as unknown as SupabaseClient;
  });

  it('consulta el mismo UUID y transforma campos y números', async () => {
    respuesta.mockResolvedValue({ data: { id: 'u1', nombre: 'Admin', rol: 'admin', fecha_nacimiento: '1970-01-01', saldo_credito: '100.5', puntos_fidelidad: '20', primera_compra_usada: true }, error: null });
    await servicio.cargar(client, user);
    expect(client.from).toHaveBeenCalledWith('perfiles');
    expect(client.from('perfiles').select('*').eq).toHaveBeenCalledWith('id', 'u1');
    expect(servicio.currentProfile()).toMatchObject({ id: 'u1', nombre: 'Admin', apellido: 'Paz', email: 'cuenta@cine.test', rol: 'admin', fechaNacimiento: '1970-01-01', saldoCredito: 100.5, puntosFidelidad: 20, primeraCompraUsada: true });
  });

  it.each([null, { message: 'Sin permisos' }])('usa metadata y valores de respaldo si no hay fila (%s)', async (error) => {
    respuesta.mockResolvedValue({ data: null, error });
    await servicio.cargar(client, user);
    expect(servicio.currentProfile()).toMatchObject({ nombre: 'Ana', apellido: 'Paz', rol: 'cliente', saldoCredito: 0, puntosFidelidad: 0, primeraCompraUsada: false });
  });

  it('limpia el perfil', async () => {
    await servicio.cargar(client, user);
    servicio.limpiar();
    expect(servicio.currentProfile()).toBeNull();
  });

  it('captura fallos de red sin propagar una excepción', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    respuesta.mockRejectedValue(new Error('Sin conexión'));
    await servicio.cargar(client, user);
    expect(servicio.currentProfile()).toBeNull();
    expect(aviso).toHaveBeenCalled();
    aviso.mockRestore();
  });

  it('no repone un perfil si la consulta termina después del logout', async () => {
    let resolver!: (value: unknown) => void;
    respuesta.mockImplementation(() => new Promise((resolve) => { resolver = resolve; }));
    const pendiente = servicio.cargar(client, user);
    servicio.limpiar();
    resolver({ data: { id: 'u1', rol: 'admin' }, error: null });
    await pendiente;
    expect(servicio.currentProfile()).toBeNull();
  });

  it('una respuesta vieja no sobrescribe el perfil de una consulta más reciente', async () => {
    let resolver!: (value: unknown) => void;
    respuesta.mockImplementationOnce(() => new Promise((resolve) => { resolver = resolve; }));
    const pendiente = servicio.cargar(client, user);
    respuesta.mockResolvedValueOnce({ data: { id: 'u2', nombre: 'Nuevo', rol: 'empleado' }, error: null });
    await servicio.cargar(client, { ...user, id: 'u2' });
    resolver({ data: { id: 'u1', nombre: 'Anterior', rol: 'admin' }, error: null });
    await pendiente;
    expect(servicio.currentProfile()).toMatchObject({ id: 'u2', nombre: 'Nuevo', rol: 'empleado' });
  });
});
