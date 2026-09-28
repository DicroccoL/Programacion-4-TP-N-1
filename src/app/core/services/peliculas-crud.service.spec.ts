import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { CrearPeliculaDTO } from '../../models/pelicula.model';
import { PeliculasService } from './peliculas.service';
import { PeliculasCrudService } from './peliculas-crud.service';

describe('PeliculasCrudService validación del formulario', () => {
  let crud: PeliculasCrudService;
  let llamadasCrear: number;
  let llamadasActualizar: number;

  const formularioValido: CrearPeliculaDTO = {
    titulo: 'La película',
    genero: 'Drama',
    sinopsis: 'Una historia para el cine.',
    duracionMin: 120,
    imagenUrl: 'https://cine.example/poster.jpg',
    clasificacion: 'ATP',
    estado: 'EN_CARTELERA',
    preventaActiva: false,
    precioPreventa: null,
    fechaEstreno: null,
  };

  beforeEach(() => {
    llamadasCrear = 0;
    llamadasActualizar = 0;

    TestBed.configureTestingModule({
      providers: [
        PeliculasCrudService,
        {
          provide: PeliculasService,
          useValue: {
            obtenerTodas: async () => [],
            crear: async () => { llamadasCrear += 1; },
            actualizar: async () => { llamadasActualizar += 1; },
            eliminar: async () => undefined,
          },
        },
      ],
    });

    crud = TestBed.inject(PeliculasCrudService);
    crud.formulario.set({ ...formularioValido });
  });

  it('bloquea el guardado si un texto obligatorio está vacío o contiene solo espacios', async () => {
    crud.formulario.update((formulario) => ({ ...formulario, titulo: '   ' }));

    const guardado = await crud.guardar();

    expect(guardado).toBe(false);
    expect(llamadasCrear).toBe(0);
    expect(crud.error()).toContain('título');
  });

  it('bloquea una duración no entera o menor que uno', async () => {
    crud.formulario.update((formulario) => ({ ...formulario, duracionMin: 90.5 }));

    const guardado = await crud.guardar();

    expect(guardado).toBe(false);
    expect(llamadasCrear).toBe(0);
    expect(crud.error()).toContain('duración');
  });

  it('bloquea una URL de imagen que no sea válida', async () => {
    crud.formulario.update((formulario) => ({ ...formulario, imagenUrl: 'imagen-sin-url' }));

    const guardado = await crud.guardar();

    expect(guardado).toBe(false);
    expect(llamadasCrear).toBe(0);
    expect(crud.error()).toContain('URL');
  });

  it('exige precio positivo cuando la preventa está activa', async () => {
    crud.formulario.update((formulario) => ({
      ...formulario,
      preventaActiva: true,
      precioPreventa: null,
    }));

    const guardado = await crud.guardar();

    expect(guardado).toBe(false);
    expect(llamadasCrear).toBe(0);
    expect(crud.error()).toContain('precio de preventa');
  });

  it('permite crear y editar películas con datos válidos', async () => {
    expect(await crud.guardar()).toBe(true);
    expect(llamadasCrear).toBe(1);

    crud.formulario.set({ ...formularioValido });
    crud.peliculaEditandoId.set('pelicula-1');

    expect(await crud.guardar()).toBe(true);
    expect(llamadasActualizar).toBe(1);
  });
});
