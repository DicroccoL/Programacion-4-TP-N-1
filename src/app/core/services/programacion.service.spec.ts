import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AuthService } from './auth.service';
import { ProgramacionService } from './programacion.service';

describe('ProgramacionService compra con ticket', () => {
  let service: ProgramacionService;
  let rpc: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    rpc = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        ProgramacionService,
        { provide: AuthService, useValue: { client: { rpc } } },
      ],
    });
    service = TestBed.inject(ProgramacionService);
  });

  it('envía las butacas a la RPC y adapta los datos devueltos para el ticket', async () => {
    rpc.mockResolvedValue({
      data: [{
        orden_id: 'orden-1', codigo_qr: 'qr-1', subtotal: 30000, descuento: 6000, codigo_cupon: 'REGISTRO20',
        total: 24000, fecha_compra: '2026-10-04T18:00:00Z',
        estado: 'PAGADA', pelicula: 'Película de prueba', fecha_funcion: '2026-10-05T20:00:00Z',
        sala: 2, formato: '2D', idioma: 'CASTELLANO', butacas: ['Fila A · Butaca 1', 'Fila A · Butaca 2'],
      }],
      error: null,
    });
    const comprobante = await service.crearOrden(
      'funcion-1', ['butaca-1', 'butaca-2'], 'token-1', null, false,
    );

    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith('comprar_orden_con_comprobante', {
      p_funcion_id: 'funcion-1', p_butaca_ids: ['butaca-1', 'butaca-2'], p_token: 'token-1',
      p_fecha_nacimiento: null, p_asiste_adulto: false,
    });
    expect(comprobante).toEqual({
      ordenId: 'orden-1', codigoQr: 'qr-1', subtotal: 30000, descuento: 6000, codigoCupon: 'REGISTRO20',
      total: 24000, fechaCompra: '2026-10-04T18:00:00Z',
      estado: 'PAGADA', pelicula: 'Película de prueba', fechaFuncion: '2026-10-05T20:00:00Z',
      sala: 2, formato: '2D', idioma: 'CASTELLANO', butacas: ['Fila A · Butaca 1', 'Fila A · Butaca 2'],
    });
  });

  it('propaga el error de Supabase para que la pantalla informe la causa', async () => {
    const error = { code: '23505', message: 'conflicto de butaca' };
    rpc.mockResolvedValue({ data: null, error });

    await expect(service.crearOrden('funcion-1', ['butaca-1'], 'token-1', null, false)).rejects.toBe(error);
  });
});
