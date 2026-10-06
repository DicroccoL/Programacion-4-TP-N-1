import { SesionService } from './sesion.service';

describe('SesionService: límite de siete minutos', () => {
  const clave = 'wildecinemas.session.startedAt';
  let servicio: SesionService;
  let usuario: string | null;
  let cerrar = vi.fn(async () => {});
  let alVolver: EventListener;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-06T12:00:00Z'));
    localStorage.clear();
    usuario = 'u1';
    cerrar = vi.fn(async () => {});
    vi.spyOn(document, 'addEventListener').mockImplementation((tipo, listener) => {
      if (tipo === 'visibilitychange') alVolver = listener as EventListener;
    });
    servicio = new SesionService();
    servicio.configurar(() => usuario, cerrar);
  });
  afterEach(() => {
    servicio.limpiar();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('guarda usuario e inicio y cierra exactamente a los siete minutos', async () => {
    servicio.iniciar('u1');
    expect(JSON.parse(localStorage.getItem(clave)!)).toEqual({ userId: 'u1', inicio: Date.now() });
    await vi.advanceTimersByTimeAsync(7 * 60 * 1000 - 1);
    expect(cerrar).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(cerrar).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(clave)).toBeNull();
  });

  it('recuperar o renovar no reinicia el tiempo original', async () => {
    servicio.iniciar('u1');
    const marca = localStorage.getItem(clave);
    await vi.advanceTimersByTimeAsync(3 * 60 * 1000);
    expect(servicio.recuperar('u1', true)).toBe(true);
    servicio.iniciar('u1');
    expect(localStorage.getItem(clave)).toBe(marca);
    await vi.advanceTimersByTimeAsync(4 * 60 * 1000);
    expect(cerrar).toHaveBeenCalledTimes(1);
  });

  it('simula actualizar la página y usa solo el tiempo restante', async () => {
    localStorage.setItem(clave, JSON.stringify({ userId: 'u1', inicio: Date.now() - 6 * 60 * 1000 }));
    expect(servicio.recuperar('u1')).toBe(true);
    await vi.advanceTimersByTimeAsync(60 * 1000);
    expect(cerrar).toHaveBeenCalledTimes(1);
  });

  it.each(['ausente', 'json inválido', 'otro usuario', 'inicio inválido', 'vencida'])(
    'rechaza una marca %s', async (caso) => {
      if (caso === 'json inválido') localStorage.setItem(clave, '{');
      if (caso === 'otro usuario') localStorage.setItem(clave, JSON.stringify({ userId: 'otro', inicio: Date.now() }));
      if (caso === 'inicio inválido') localStorage.setItem(clave, JSON.stringify({ userId: 'u1', inicio: 'ayer' }));
      if (caso === 'vencida') localStorage.setItem(clave, JSON.stringify({ userId: 'u1', inicio: Date.now() - 420000 }));
      expect(servicio.recuperar('u1')).toBe(false);
      await servicio.verificar();
      expect(cerrar).toHaveBeenCalledTimes(1);
    },
  );

  it('solo un inicio nuevo puede crear una marca faltante', () => {
    expect(servicio.recuperar('u1')).toBe(false);
    expect(servicio.recuperar('u1', true)).toBe(true);
  });

  it('sin usuario no intenta cerrar una sesión', async () => {
    usuario = null;
    await servicio.verificar();
    expect(cerrar).not.toHaveBeenCalled();
  });

  it('limpiar cancela el cierre programado', async () => {
    servicio.iniciar('u1');
    servicio.limpiar();
    await vi.advanceTimersByTimeAsync(420000);
    expect(cerrar).not.toHaveBeenCalled();
    expect(localStorage.getItem(clave)).toBeNull();
  });

  it('al volver a la pestaña detecta el vencimiento aunque el timer no se ejecutó', async () => {
    servicio.iniciar('u1');
    vi.setSystemTime(Date.now() + 420000);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    alVolver(new Event('visibilitychange'));
    await Promise.resolve();
    expect(cerrar).toHaveBeenCalledTimes(1);
  });

  it('evita dos cierres simultáneos', async () => {
    let terminar!: () => void;
    cerrar.mockImplementation(() => new Promise<void>((resolve) => { terminar = resolve; }));
    const pendiente = servicio.cerrar();
    await servicio.cerrar();
    expect(cerrar).toHaveBeenCalledTimes(1);
    terminar();
    await pendiente;
  });

  it('limpia y permite otro cierre después de un error', async () => {
    servicio.iniciar('u1');
    cerrar.mockRejectedValueOnce(new Error('Sin conexión'));
    await expect(servicio.cerrar()).rejects.toThrow('Sin conexión');
    expect(localStorage.getItem(clave)).toBeNull();
    await servicio.cerrar();
    expect(cerrar).toHaveBeenCalledTimes(2);
  });
});
