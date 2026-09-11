import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponenteLogin } from './componente-login';

describe('ComponenteLogin', () => {
  let component: ComponenteLogin;
  let fixture: ComponentFixture<ComponenteLogin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComponenteLogin],
    }).compileComponents();

    fixture = TestBed.createComponent(ComponenteLogin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
