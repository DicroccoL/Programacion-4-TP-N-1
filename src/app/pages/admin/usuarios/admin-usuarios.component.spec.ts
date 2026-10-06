import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/services/auth.service';
import { AdminUsuariosComponent } from './admin-usuarios.component';

describe('Creación administrativa de usuarios', () => {
  let componente: AdminUsuariosComponent;
  let invoke: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    invoke = vi.fn().mockResolvedValue({data:{id:'nuevo'},error:null});
    TestBed.configureTestingModule({providers:[{provide:AuthService,useValue:{client:{functions:{invoke}}}}]});
    componente = TestBed.runInInjectionContext(() => new AdminUsuariosComponent());
    Object.assign(componente,{nombre:' Ana ',apellido:' Pérez ',email:'ana@example.com',password:'clave-test-123',rol:'empleado'});
  });
  it.each(['nombre','apellido','email','password'] as const)('rechaza %s con solo espacios', async campo => {
    componente[campo] = '        '; await componente.crear();
    expect(invoke).not.toHaveBeenCalled(); expect(componente.error()).toBeTruthy();
  });
  it('rechaza un correo inválido y una contraseña corta', async () => {
    componente.email='no-es-correo'; await componente.crear();
    componente.email='ana@example.com'; componente.password='123'; await componente.crear();
    expect(invoke).not.toHaveBeenCalled();
  });
  it('envía solamente los cinco campos y limpia el formulario', async () => {
    await componente.crear();
    expect(invoke).toHaveBeenCalledWith('crear-usuario-privilegiado',{body:{nombre:'Ana',apellido:'Pérez',email:'ana@example.com',password:'clave-test-123',rol:'empleado'}});
    expect(componente.mensaje()).toContain('Cuenta creada'); expect(componente.password).toBe('');
    expect(componente.guardando()).toBe(false);
  });
  it('informa los errores del servidor', async () => {
    invoke.mockResolvedValue({data:{error:'Correo existente'},error:null}); await componente.crear();
    expect(componente.error()).toBe('Correo existente'); expect(componente.guardando()).toBe(false);
  });
});
