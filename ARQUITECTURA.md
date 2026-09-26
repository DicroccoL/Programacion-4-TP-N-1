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

## Sección Admin — Cómo funciona

> Esta es la parte que genera más dudas. Se explica de adentro hacia afuera.

### Capas (de menor a mayor)

```
┌─────────────────────────────────────────────────────┐
│  AdminComponent                                     │
│  (elige qué sección mostrar: Películas, Salas, ...) │
│                                                     │
│  └─ AdminPeliculasComponent                         │
│     (elige qué pestaña mostrar: Crear / Listar)     │
│                                                     │
│     ├─ AdminPeliculasTabsComponent  ← solo botones  │
│     ├─ FormularioPeliculaComponent  ← solo el form  │
│     └─ ListadoPeliculasComponent    ← solo la tabla │
└─────────────────────────────────────────────────────┘
```

### ¿Por qué existe PeliculasCrudService?

Antes, `AdminPeliculasComponent` tenía **toda** la lógica: las llamadas al API, el estado de loading, el formulario, los mensajes de error — todo. Y lo pasaba a los hijos via `@Input`.

Ahora ese estado vive en el **service** y los componentes lo leen directamente.

```
PeliculasCrudService  (providedIn: 'root')
  ├─ peliculas()        ← lista actual
  ├─ cargando()         ← spinner
  ├─ guardando()        ← botón deshabilitado
  ├─ mensaje()          ← "Película creada ✓"
  ├─ error()            ← "No se pudo guardar"
  ├─ formulario()       ← campos del form
  └─ peliculaEditandoId() ← null = crear, id = editar
```

Cada componente hijo **inyecta el service** y lee/escribe directamente. No hay `@Input` de estado.

### Responsabilidad de cada pieza

| Archivo | Hace una sola cosa |
|--------|-------------------|
| `AdminComponent` | Muestra las pestañas del panel (Películas / Salas / ...) |
| `AdminPeliculasComponent` | Cambia entre "Crear" y "Listar" |
| `AdminPeliculasTabsComponent` | Renderiza los dos botones de tab |
| `FormularioPeliculaComponent` | Muestra el form, llama `crud.guardar()` |
| `ListadoPeliculasComponent` | Muestra la tabla, llama `crud.eliminar()` o `crud.iniciarEdicion()` |
| `PeliculasCrudService` | Toda la lógica: API calls + estado reactivo (signals) |

### Flujo de una acción: "Editar película"

```
1. Usuario hace click en "Editar" en la tabla
2. ListadoPeliculasComponent.editar(pelicula)
      → crud.iniciarEdicion(pelicula)   // carga datos al formulario
      → emite: editarSolicitado
3. AdminPeliculasComponent.irAlFormulario()
      → apartadoActivo.set('crear')     // cambia la pestaña
4. FormularioPeliculaComponent se muestra
      → lee crud.formulario()           // ya tiene los datos de la película
5. Usuario edita y presiona "Guardar"
6. FormularioPeliculaComponent.enviar()
      → await crud.guardar()            // llama al API
      → emite: guardadoExitoso
7. AdminPeliculasComponent.irAlListado()
      → apartadoActivo.set('listar')    // vuelve a la tabla
```

---

## Estructura de carpetas (solo admin)

```
pages/admin/
├── admin.component.*          ← panel principal con tabs globales
└── admin-peliculas/
    ├── admin-peliculas.component.*        ← orquesta tabs
    ├── admin-peliculas-tabs/
    │   └── admin-peliculas-tabs.component.*  ← botones Crear/Listar
    ├── formulario-pelicula/
    │   └── formulario-pelicula.component.*   ← form de alta/edición
    └── listado-peliculas/
        └── listado-peliculas.component.*     ← tabla de películas

core/services/
├── peliculas.service.ts       ← HTTP calls al backend
└── peliculas-crud.service.ts  ← estado del CRUD (signals)
```

---

## Regla de oro

> **Si necesitás agregar una nueva sección** (ej: Salas):
> 1. Crear `admin-salas/` con la misma estructura que `admin-peliculas/`.
> 2. Crear `salas-crud.service.ts` en `core/services/`.
> 3. Agregar el case en `admin.component.html` y `admin.component.ts`.
> 4. No tocar nada de películas.
