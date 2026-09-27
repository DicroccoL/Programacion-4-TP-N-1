# Flujo de administración

Este documento explica cómo funciona la sección de administración en su estado actual y por qué está distribuida en varios archivos.

## 1. Punto de entrada

La pantalla principal del administrador está en:

- `src/app/pages/admin/admin.component.ts`
- `src/app/pages/admin/admin.component.html`

`AdminComponent` es el contenedor general del panel:

- guarda la sección activa (`peliculas`, `salas`, `funciones`, etc.)
- renderiza el contenido correspondiente con un `switch`
- para la sección `peliculas`, muestra `<app-admin-peliculas />`

## 2. Sección de películas

La lógica de películas vive en:

- `src/app/pages/admin/peliculas/admin-peliculas.component.ts`
- `src/app/pages/admin/peliculas/admin-peliculas.component.html`

Este componente no hace CRUD por sí mismo. Lo que hace es:

- inicializar el listado de películas al entrar
- manejar qué apartado está activo: `crear` o `listar`
- cambiar de vista según la acción del usuario

Tiene esta lógica central:

- `ngOnInit()`: llama a `crud.cargarPeliculas()`
- `seleccionarApartado(apartado)`: cambia la pestaña activa
- `irAlListado()`: al guardar o crear, vuelve a la vista de listado
- `irAlFormulario()`: al editar, vuelve a la vista de formulario

## 3. Pestañas internas del CRUD

Las pestañas se encuentran en:

- `src/app/pages/admin/peliculas/admin-peliculas-tabs/admin-peliculas-tabs.component.ts`
- `src/app/pages/admin/peliculas/admin-peliculas-tabs/admin-peliculas-tabs.component.html`
- `src/app/pages/admin/peliculas/admin-peliculas-tabs/admin-peliculas-tabs.component.css`

Este componente es muy simple:

- recibe `active` (`'crear' | 'listar'`)
- emite `change` con la pestaña elegida
- no tiene lógica de negocio ni acceso a la API

## 4. Formulario de película

El formulario está en:

- `src/app/pages/admin/peliculas/formulario-pelicula/formulario-pelicula.component.ts`
- `src/app/pages/admin/peliculas/formulario-pelicula/formulario-pelicula.component.html`

Su responsabilidad es:

- mostrar los campos del formulario
- bindear los datos con `crud.formulario()`
- al enviar, llamar `this.crud.guardar()`
- si la operación fue exitosa, emitir `guardadoExitoso`

Importante: el formulario NO guarda directamente en una variable local; usa el servicio compartido.

## 5. Listado de películas

El listado está en:

- `src/app/pages/admin/peliculas/listado-peliculas/listado-peliculas.component.ts`
- `src/app/pages/admin/peliculas/listado-peliculas/listado-peliculas.component.html`

Su responsabilidad es:

- mostrar `crud.peliculas()`
- renderizar estado de carga y errores
- editar una película con `crud.iniciarEdicion(pelicula)`
- eliminar una película con `crud.eliminar(pelicula)`

Cuando se presiona editar:

- el componente llama al servicio para preparar el formulario
- emite `editarSolicitado`
- el componente padre cambia a la sección `crear`

## 6. Servicio CRUD centralizado

La lógica de negocio y estado compartido está en:

- `src/app/core/services/peliculas-crud.service.ts`

Este service hace de "estado global del módulo" para películas. Tiene responsabilidades como:

- cargar películas desde la fuente de datos
- guardar nueva película o editar la existente
- eliminar películas
- mantener `peliculas`, `cargando`, `error`, `mensaje`
- mantener el formulario activo (`formulario()`)
- mantener qué película está siendo editada (`peliculaEditandoId()`)
- limpiar la edición y preparar un nuevo formulario

## 7. Flujo completo de un caso real

### Crear película

1. El usuario hace click en `Películas` en el admin.
2. `AdminComponent` renderiza `app-admin-peliculas`.
3. `AdminPeliculasComponent` carga películas con `crud.cargarPeliculas()`.
4. El usuario está en la vista `crear`.
5. Completa el formulario.
6. `FormularioPeliculaComponent` llama a `crud.guardar()`.
7. `PeliculasCrudService` valida y persiste la película.
8. Si todo sale bien, emite `guardadoExitoso`.
9. El padre cambia a la vista `listar`.
10. El listado vuelve a mostrar la lista actualizada.

### Editar película

1. En el listado, se presiona `Editar`.
2. `ListadoPeliculasComponent` llama `crud.iniciarEdicion(pelicula)`.
3. El service carga esa película en el formulario compartido.
4. El padre cambia a la vista `crear`.
5. El formulario se rellena con los datos.
6. Cuando se guarda, `crud.guardar()` actualiza en lugar de crear una nueva.

## 8. ¿Por qué está distribuido así?

Esta estructura intenta separar responsabilidades:

- `AdminComponent`: controla navegación del panel
- `AdminPeliculasComponent`: controla la vista interna del CRUD
- `Tabs`: solo cambia entre `crear` y `listar`
- `Formulario`: solo edita y envía
- `Listado`: solo consume y muestra
- `PeliculasCrudService`: concentra lógica compartida y estado

Es una buena práctica cuando hay más de una vista usando el mismo estado, o cuando la lógica de negocio empieza a crecer.

La desventaja es que para alguien nuevo resulta más difícil seguir el flujo, porque la lógica está repartida entre varios archivos.

## 9. Recomendación

Si este módulo se mantiene pequeño, se puede simplificar un poco:

- dejar la lógica en el componente padre `AdminPeliculasComponent`
- o mantener el servicio pero documentar este flujo

La forma actual es válida y bastante típica en Angular, pero requiere claridad en la arquitectura para que el flujo sea entendible.
