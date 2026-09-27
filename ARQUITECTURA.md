# WildeCinemas — Arquitectura y flujo de la app

## Rutas principales

| URL | Componente | Acceso |
|-----|-----------|--------|
| `/` | `InicioComponent` | Público |
| `/login` | `AuthComponent` | Público |
| `/pelicula/:id` | `DetallePeliculaComponent` | Público |
| `/admin` | `AdminComponent` | 🔒 Guard de admin |

---

## Flujo general

```
Browser
  └─► AppComponent (router-outlet)
        ├─ AppLayoutComponent (navbar + footer)
        └─ Página activa según ruta
```

---

## Sección pública — Inicio

```
InicioComponent
  ├─ Hero con promo → link a /login?tab=register
  ├─ Cartelera (PeliculasService.obtenerCartelera)
  └─ Próximamente (PeliculasService.obtenerProximamente)
```

**Auth** (`/login`): dos pestañas internas — login / registro.  
Si viene con `?tab=register` en la URL, abre el registro directamente.

---

## Sección Admin — flujo actual

La parte admin está organizada por secciones. La pantalla principal del panel es `AdminComponent` y desde ahí se decide qué bloque mostrar.

### 1) Panel principal del admin

Archivo:

- `src/app/pages/admin/admin.component.ts`
- `src/app/pages/admin/admin.component.html`

Responsabilidad:

- mostrar el header con las pestañas (`Películas`, `Salas`, `Funciones`, etc.)
- guardar la sección activa (`seccionActiva`)
- renderizar el contenido de la sección seleccionada

Ejemplo:

```html
@switch (seccionActiva()) {
  @case ('peliculas') {
    <app-admin-peliculas />
  }
}
```

---

### 2) Subsección de películas

Archivo:

- `src/app/pages/admin/peliculas/admin-peliculas.component.ts`
- `src/app/pages/admin/peliculas/admin-peliculas.component.html`

Responsabilidad:

- orquestar el CRUD de películas
- decidir si se muestra formulario o listado
- mantener el estado de la pestaña interna (`crear` / `listar`)

El componente principal del CRUD es:

```ts
readonly apartadoActivo = signal<'crear' | 'listar'>('crear');
```

Cuando cambia la pestaña, el padre decide qué hijo mostrar.

---

### 3) Pestañas internas de películas

Archivo:

- `src/app/pages/admin/peliculas/admin-peliculas-tabs/admin-peliculas-tabs.component.ts`
- `src/app/pages/admin/peliculas/admin-peliculas-tabs/admin-peliculas-tabs.component.html`

Responsabilidad:

- mostrar solo dos botones: `Crear película` y `Películas cargadas`
- emitir el evento `change` cuando el usuario cambia de pestaña

No tiene lógica de negocio ni acceso a los datos reales; solo delega a la capa superior.

---

### 4) Formulario de película

Archivo:

- `src/app/pages/admin/peliculas/formulario-pelicula/formulario-pelicula.component.ts`
- `src/app/pages/admin/peliculas/formulario-pelicula/formulario-pelicula.component.html`

Responsabilidad:

- mostrar el formulario de alta/edición
- consumir el servicio del CRUD para guardar
- emitir `guardadoExitoso` al padre cuando termina bien

La parte clave es:

```ts
const ok = await this.crud.guardar();
if (ok) this.guardadoExitoso.emit();
```

El formulario no guarda en un estado local propio; usa el service como fuente única de datos del módulo.

---

### 5) Listado de películas

Archivo:

- `src/app/pages/admin/peliculas/listado-peliculas/listado-peliculas.component.ts`
- `src/app/pages/admin/peliculas/listado-peliculas/listado-peliculas.component.html`

Responsabilidad:

- listar las películas actuales (`crud.peliculas()`)
- mostrar mensajes de carga/error
- editar una película con `crud.iniciarEdicion(pelicula)`
- eliminar una película con `crud.eliminar(pelicula)`

Cuando se quiere editar:

```ts
editar(pelicula: Pelicula): void {
  this.crud.iniciarEdicion(pelicula);
  this.editarSolicitado.emit();
}
```

Eso hace que el padre cambie de pestaña y muestre el formulario con los datos ya cargados.

---

## Servicio CRUD centralizado

Archivo:

- `src/app/core/services/peliculas-crud.service.ts`

Este service concentra la lógica del módulo de películas. Tiene la responsabilidad de manejar:

- `peliculas()` → lista actual de películas
- `cargando()` → estado de carga
- `error()` → errores del servicio
- `mensaje()` → mensajes de éxito/error para mostrar en UI
- `formulario()` → estado del formulario actual
- `peliculaEditandoId()` → si se está editando, guarda el id; si es `null`, se está creando
- `cargarPeliculas()`, `guardar()`, `eliminar()`, `iniciarEdicion()`, `limpiarEdicion()`

Es decir, el service es la capa de estado compartido entre formulario y listado.

---

## ¿Por qué está distribuido así?

La intención es separar responsabilidades:

| Componente | Regla de responsabilidad |
|-----------|-------------------------|
| `AdminComponent` | navegación del panel general |
| `AdminPeliculasComponent` | control del CRUD de películas |
| `AdminPeliculasTabsComponent` | botones de selección |
| `FormularioPeliculaComponent` | alta/edición |
| `ListadoPeliculasComponent` | tabla y acciones |
| `PeliculasCrudService` | estado, validaciones y llamadas al backend |

Esto es una buena práctica en Angular cuando la lógica crece. La ventaja es que cada pieza hace una sola cosa y el estado queda centralizado.

La desventaja es que el flujo puede parecer más complejo si no hay una explicación clara, porque la lógica no está en un solo archivo.

---

## Flujo completo: editar película

```text
1. Usuario hace click en Editar en el listado
2. ListadoPeliculasComponent.editar(pelicula)
   → this.crud.iniciarEdicion(pelicula)
3. El service llena el formulario con los datos de la película
4. Se emite `editarSolicitado`
5. AdminPeliculasComponent.irAlFormulario()
   → apartadoActivo.set('crear')
6. Se renderiza FormularioPeliculaComponent
7. El usuario modifica la película y presiona Guardar
8. FormularioPeliculaComponent.enviar()
   → await this.crud.guardar()
9. El service actualiza la data
10. El padre vuelve a la vista de listado
```

---

## Flujo completo: crear película

```text
1. Usuario entra a la sección Películas
2. AdminPeliculasComponent carga la lista
3. El usuario elige "Crear película"
4. Se muestra FormularioPeliculaComponent
5. Completa campos
6. Ejecuta crud.guardar()
7. El service persiste la película
8. Se emite guardadoExitoso
9. Padre cambia a la pestaña "listar"
10. Se muestra la lista actualizada
```

---

## Estructura de carpetas actual

```text
src/app/
├── core/
│   └── services/
│       ├── auth.service.ts
│       ├── peliculas.service.ts
│       └── peliculas-crud.service.ts
│
├── pages/
│   ├── admin/
│   │   ├── admin.component.*
│   │   ├── README.md
│   │   └── peliculas/
│   │       ├── admin-peliculas.component.*
│   │       ├── admin-peliculas-tabs/
│   │       │   └── admin-peliculas-tabs.component.*
│   │       ├── formulario-pelicula/
│   │       │   └── formulario-pelicula.component.*
│   │       └── listado-peliculas/
│   │           └── listado-peliculas.component.*
│   │
│   ├── auth/
│   ├── detalle-pelicula/
│   └── inicio/
```

---

## Regla de oro

> Si se agrega una nueva sección del panel (por ejemplo `salas`, `funciones`, `candybar`), la estructura recomendada es:
>
> 1. crear una carpeta `src/app/pages/admin/<nombre-seccion>/`
> 2. crear los subcomponentes dentro de esa carpeta
> 3. crear un `*-crud.service.ts` si hace falta un estado compartido
> 4. agregar la sección en `AdminComponent`

Eso mantiene la arquitectura consistente y escalable.
