import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { InicioComponent } from './inicio.component';
import { AuthService } from '../../core/services/auth.service';
import { ExperienciaClienteService } from '../../core/services/experiencia-cliente.service';
import { CuponesService } from '../../core/services/cupones.service';
import { PeliculasService } from '../../core/services/peliculas.service';
import { ReseniasService } from '../../core/services/resenias.service';

describe('Alertas desde Inicio',()=>{
  let inicio:InicioComponent;let loggedIn:boolean;
  let activar:ReturnType<typeof vi.fn>;let navigate:ReturnType<typeof vi.fn>;
  beforeEach(()=>{
    loggedIn=true;activar=vi.fn().mockResolvedValue(undefined);navigate=vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({providers:[
      {provide:AuthService,useValue:{currentUser:()=>loggedIn?{id:'u1'}:null}},
      {provide:ExperienciaClienteService,useValue:{activarAlerta:activar}},
      {provide:Router,useValue:{navigate}},
      {provide:PeliculasService,useValue:{}},{provide:ReseniasService,useValue:{}},{provide:CuponesService,useValue:{}},
    ]});inicio=TestBed.runInInjectionContext(()=>new InicioComponent());
  });
  it('lleva al invitado al login y no escribe una alerta',async()=>{
    loggedIn=false;await inicio.activarAlerta('p1');
    expect(navigate).toHaveBeenCalledWith(['/login'],{queryParams:{redirect:'/'}});expect(activar).not.toHaveBeenCalled();
  });
  it('muestra éxito y marca la película luego de persistir',async()=>{
    await inicio.activarAlerta('p1');expect(inicio.alertasActivas().has('p1')).toBe(true);
    expect(inicio.mensajeAlerta()).toContain('Mis películas');
  });
  it('no marca como activada una alerta que falló',async()=>{
    activar.mockRejectedValue(new Error('Sin conexión'));await inicio.activarAlerta('p1');
    expect(inicio.alertasActivas().has('p1')).toBe(false);expect(inicio.mensajeAlerta()).toBe('Sin conexión');
  });
});
