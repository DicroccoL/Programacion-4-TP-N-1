import { SelectorFechaComponent } from './selector-fecha.component';
import { FechaArgentinaPipe } from '../../pipes/fecha-argentina.pipe';

describe('Fechas por segmentos',()=>{
  it('separa una fecha ISO en día, mes y año',()=>{
    const c=new SelectorFechaComponent();c.writeValue('2000-02-29');
    expect([c.dia,c.mes,c.anio]).toEqual(['29','02','2000']);
  });
  it('no emite fechas imposibles',()=>{
    const c=new SelectorFechaComponent();const cambio=vi.fn();c.registerOnChange(cambio);c.writeValue('2001-02-28');
    c.escribir('dia',{target:{value:'31'}} as unknown as Event); expect(cambio).toHaveBeenLastCalledWith('');
  });
  it('solo conserva dígitos y emite una fecha completa en ISO',()=>{
    const c=new SelectorFechaComponent();const cambio=vi.fn();c.registerOnChange(cambio);c.writeValue('2000-02-29');
    c.escribir('dia',{target:{value:'12a'}} as unknown as Event); expect(cambio).toHaveBeenLastCalledWith('2000-02-12');
  });
  it('el pipe rechaza fechas imposibles y no desplaza las fechas sin hora',()=>{
    const pipe=new FechaArgentinaPipe();expect(pipe.transform('2000-02-29')).toBe('29/02/2000');
    expect(pipe.transform('2001-02-29')).toBe(''); expect(pipe.transform('no-es-fecha')).toBe('');
  });
});
