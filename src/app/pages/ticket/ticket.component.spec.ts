import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideRouter } from '@angular/router';
import { TicketComponent } from './ticket.component';
import { ComprobanteCompra } from '../../core/services/compras.service';

describe('TicketComponent', () => {
  const comprobante: ComprobanteCompra = {
    ordenId: 'orden-test-1', codigoQr: 'qr-test-1', subtotal: 15000, descuento: 3000,
    codigoCupon: 'REGISTRO20', total: 12000,
    fechaCompra: '2026-10-04T18:00:00Z', estado: 'PAGADA', pelicula: 'Película de prueba',
    fechaFuncion: '2026-10-05T20:00:00Z', sala: 1, formato: '2D', idioma: 'CASTELLANO',
    butacas: ['Fila A · Butaca 1'],
  };

  beforeEach(async () => {
    sessionStorage.setItem(`ticket:${comprobante.ordenId}`, JSON.stringify(comprobante));
    await TestBed.configureTestingModule({
      imports: [TicketComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => comprobante.ordenId } } } },
      ],
    }).compileComponents();
  });

  afterEach(() => sessionStorage.removeItem(`ticket:${comprobante.ordenId}`));

  it('muestra el ticket, su QR y la opción para descargar el PDF', async () => {
    const fixture = TestBed.createComponent(TicketComponent);
    fixture.detectChanges();
    await fixture.componentInstance.ngOnInit();
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('h1')?.textContent).toContain('Tu ticket');
    expect(page.textContent).toContain('Película de prueba');
    expect(page.textContent).toContain('Fila A · Butaca 1');
    expect(page.textContent).toContain('Compra confirmada');
    expect(page.textContent).toContain('REGISTRO20');
    expect(page.textContent).toContain('$ 3.000');
    expect(page.querySelector('img[alt="QR de identificación de la orden"]')?.getAttribute('src')).toMatch(/^data:image\/png;base64,/);
    expect(page.querySelector('button')?.textContent).toContain('Descargar ticket en PDF');
  });
});
