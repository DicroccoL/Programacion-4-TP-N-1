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

## 7. Servicios de acceso a datos y autenticación

Además del CRUD de administración, hay dos servicios fundamentales que aparecen en la app y que cumplen funciones distintas.

### 7.1 `PeliculasService`

Archivo:

- `src/app/core/services/peliculas.service.ts`

Este servicio es el que se encarga de consultar películas desde Supabase y devolver objetos del dominio de la app.

Su responsabilidad no es controlar la UI ni el estado del panel de admin. Su trabajo es más técnico y de acceso a datos.

#### ¿Qué hace?

- `obtenerTodas()`: trae todas las películas
- `obtenerCartelera()`: trae solo las que tienen estado `EN_CARTELERA`
- `obtenerProximamente()`: trae solo las que tienen estado `PROXIMAMENTE`
- `obtenerPorId(id)`: trae una película por su id
- `crear(datos)`: inserta una nueva película
- `actualizar(id, datos)`: modifica una película existente
- `eliminar(id)`: elimina una película

#### ¿Dónde se usa?

Se usa principalmente en la parte pública y en la lógica de lectura del sistema:

- `InicioComponent` para mostrar cartelera y próximamente
- `DetallePeliculaComponent` para mostrar datos de una película específica
- `PeliculasCrudService` como capa base para guardar/editar/borrar, porque encapsula las operaciones reales con Supabase

#### ¿Para qué se creó?

Para separar la capa de acceso a datos de la capa de UI y de la capa de estado del CRUD.

Es decir:

- `PeliculasService` = "consulto y persisto datos de películas"
- `PeliculasCrudService` = "gestión de estado del admin y UX del CRUD"

#### Ejemplo conceptual

```ts
const peliculas = await this.peliculasService.obtenerCartelera();
```

Esto devuelve datos ya mapeados a la interfaz `Pelicula`, lista para usarse en una vista.

---

### 7.2 `AuthService`

Archivo:

- `src/app/core/services/auth.service.ts`

Este servicio es el responsable de la autenticación del usuario con Supabase y del estado de sesión.

#### ¿Qué hace?

- crea el cliente de Supabase
- inicializa la sesión actual
- escucha cambios de login/logout
- carga el perfil del usuario
- hace login
- hace registro
- hace logout
- expone señales reactivas como:
  - `currentUser`
  - `currentProfile`
  - `isLoggedIn`
  - `isAdmin`
  - `isEmpleado`
  - `isCliente`

#### ¿Dónde se usa?

Se usa en muchas partes de la app:

- `AdminComponent` para mostrar el nombre del usuario actual y saber si es admin
- `AuthComponent` / login / registro para iniciar sesión y crear usuarios
- guards para restringir acceso a rutas privadas
- cualquier vista que necesita saber si el usuario está logueado o qué rol tiene

#### ¿Para qué se creó?

Para centralizar toda la autenticación y el estado de sesión en un único punto.

Sin este servicio, cada componente tendría que:

- crear cliente de Supabase
- leer sesión
- validar roles
- manejar login y logout
- reaccionar a cambios de autenticación

Eso rompería la separación de responsabilidades.

#### Ejemplo conceptual

```ts
const perfil = this.authService.currentProfile();
const esAdmin = this.authService.isAdmin();
```

Eso permite que la UI sepa si el usuario actual tiene permisos para entrar al admin.

---

## 8. Relación entre servicios

Los tres servicios tienen roles distintos:

- `AuthService`: autenticación y sesión del usuario
- `PeliculasService`: acceso directo a la tabla de películas en Supabase
- `PeliculasCrudService`: lógica de estado y UX del CRUD del admin para películas

En otras palabras:

- `AuthService` responde a: "¿quién es el usuario?"
- `PeliculasService` responde a: "¿qué películas existen?"
- `PeliculasCrudService` responde a: "¿cómo administra el admin esas películas?"

## 9. Recomendación

La separación es correcta porque cada servicio resuelve un problema distinto. El punto importante es no mezclar responsabilidades:

- no poner lógica de autenticación dentro del CRUD
- no poner validaciones del admin dentro de `PeliculasService`
- no poner UI del formulario dentro de `AuthService`

Cada servicio debe manejar una capa de la aplicación.

## 10. Flujo completo del admin con servicios

```text
1. Usuario entra a /admin
2. AuthService sabe si hay sesión activa y qué rol tiene
3. AdminComponent renderiza la sección correspondiente
4. Si es Películas, AdminPeliculasComponent llama a PeliculasCrudService
5. PeliculasCrudService usa PeliculasService para cargar/guardar/editar/borrar
6. Formulario y Listado leen/escriben el mismo estado del service
7. Todo el flujo queda centralizado y reutilizable
```

Esta separación es práctica y esperable en Angular, pero solo se vuelve clara si se explica bien la diferencia entre los servicios.
