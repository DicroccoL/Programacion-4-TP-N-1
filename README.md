# WildeCinemas — Proyecto de cine

## 1. Objetivo del proyecto

Sistema de cine desarrollado en Angular con enfoque en la experiencia de compra de entradas, administración del catálogo y gestión básica del negocio.

Este documento concentra los requerimientos del cliente y la guía de arquitectura para que el proyecto quede ordenado y entendible.

---

## 2. Requerimientos del negocio

### 2.1 Prioridad 1 — Núcleo del negocio

#### Modelo de datos base

- Películas: nombre, imagen, sinopsis, duración, formato (2D/3D/4D/5D), idioma, géneros, restricción de edad.
- Salas: estructura fija de 20 filas x 3 columnas, con filas accesibles y butacas VIP en R, S, T.
- Funciones: película + sala + horario, respetando 30 minutos entre funciones en la misma sala.
- Asignación automática de sala según horario y disponibilidad.

#### Usuarios

- Registro con nombre, apellido, fecha de nacimiento, tipo de sangre, color de ojos y vacaciones.
- Compra anónima permitida.
- Beneficio por registrarse: cupón del 20% en la primera compra.
- Restricción por edad: bloquear compra de entradas +13/+18 a menores sin acompañante adulto.

#### Flujo de compra

- Selección de butacas en tiempo real.
- Diferenciación visual de butacas VIP y accesibles.
- Generación de PDF con entrada y código QR.
- Claridad antes del pago sobre si la butaca seleccionada es VIP.

#### Panel de administración

- CRUD de películas, salas, funciones, distribución de butacas y productos.
- Roles admin vs empleado.

### 2.2 Prioridad 2 — Operación diaria

- Validación de entradas por QR.
- Candy bar con productos por categoría y compra conjunta.
- Búsqueda de películas por género.
- Página principal con películas más vendidas.
- Combos de entrada + pochoclos + bebida.
- Cupones configurables por admin.

### 2.3 Prioridad 3 — Experiencia de usuario

- Reseñas con estrellas y comentarios.
- Cancelación de compra hasta 2 horas antes.
- UX simple, usable y sin scroll excesivo.

### 2.4 Prioridad 4 — Fidelización y reportes

- Programa de puntos.
- Sección "Próximamente" y preventa.
- Historial de películas del usuario.
- Reportes de ventas y facturación.
- Log de actividad en admin.

### 2.5 Prioridad 5 — Opcional

- Mapa del cine con ubicación de la sala.

### 2.6 Transversales

- Buenas prácticas de Angular.
- Integración con Supabase.
- PWA.
- Estilo visual propio.
- Lógica de negocio consistente con horarios, edad, stock y QR.

---

## 3. Arquitectura general

### 3.1 Estructura principal

```text
src/app/
├── app.routes.ts
├── app.config.ts
├── app.ts
├── main.ts
├── core/
│   ├── directives/
│   ├── guards/
│   └── services/
├── layout/
├── models/
├── pages/
│   ├── admin/
│   ├── auth/
│   ├── detalle-pelicula/
│   └── inicio/
├── shared/
└── environments/
```

### 3.2 Capa de negocio

- `core/services`: lógica de acceso a datos y servicios compartidos.
- `models`: tipos y interfaces del dominio.
- `pages`: pantallas y módulos funcionales.
- `shared`: componentes reutilizables.

---

## 4. Flujo actual del administrador

La administración está dividida por sección y por responsabilidades. El flujo actual es el siguiente:

### 4.1 Entrada del admin

El panel general se encuentra en:

- `src/app/pages/admin/admin.component.ts`
- `src/app/pages/admin/admin.component.html`

`AdminComponent`:

- guarda la sección activa (`peliculas`, `salas`, `funciones`, etc.)
- muestra el header de tabs
- renderiza el contenido de la sección seleccionada

### 4.2 Sub-sección de películas

La sección de películas vive en:

- `src/app/pages/admin/peliculas/admin-peliculas.component.ts`
- `src/app/pages/admin/peliculas/admin-peliculas.component.html`

Este componente:

- inicializa el listado de películas
- define si la vista actual es `crear` o `listar`
- cambia entre formulario y listado según la acción del usuario

### 4.3 Tabs internas del CRUD

En:

- `src/app/pages/admin/peliculas/admin-peliculas-tabs/admin-peliculas-tabs.component.ts`

Se renderizan dos botones:

- Crear película
- Películas cargadas

Solo emiten el cambio de pestaña, sin lógica de negocio.

### 4.4 Formulario de películas

En:

- `src/app/pages/admin/peliculas/formulario-pelicula/formulario-pelicula.component.ts`
- `src/app/pages/admin/peliculas/formulario-pelicula/formulario-pelicula.component.html`

Se encarga de:

- mostrar los campos del formulario
- bindear con `crud.formulario()`
- guardar con `crud.guardar()`
- emitir `guardadoExitoso`

### 4.5 Listado de películas

En:

- `src/app/pages/admin/peliculas/listado-peliculas/listado-peliculas.component.ts`
- `src/app/pages/admin/peliculas/listado-peliculas/listado-peliculas.component.html`

Se encarga de:

- mostrar la tabla
- editar con `crud.iniciarEdicion(pelicula)`
- eliminar con `crud.eliminar(pelicula)`
- reflejar estados de carga y error

### 4.6 Servicio central del CRUD

En:

- `src/app/core/services/peliculas-crud.service.ts`

Este servicio centraliza el estado y la lógica del CRUD de películas.

Mantiene:

- `peliculas()`
- `cargando()`
- `error()`
- `mensaje()`
- `formulario()`
- `peliculaEditandoId()`

Se usa como fuente de verdad compartida entre formulario y listado.

---

## 5. Flujo de acción: crear y editar

### 5.1 Crear película

```text
AdminComponent
  -> renderiza app-admin-peliculas
  -> AdminPeliculasComponent
      -> se muestra vista 'crear'
      -> FormularioPeliculaComponent
          -> ingreso de datos
          -> crud.guardar()
          -> si OK, emit guardadoExitoso
      -> vuelve a vista 'listar'
```

### 5.2 Editar película

```text
ListadoPeliculasComponent
  -> click en Editar
  -> crud.iniciarEdicion(pelicula)
  -> emit editarSolicitado
  -> AdminPeliculasComponent
      -> cambia a 'crear'
      -> FormularioPeliculaComponent
          -> carga los datos del servicio
          -> usuario guarda cambios
```

---

## 6. ¿Por qué está distribuido así?

La separación es una buena práctica en Angular cuando la lógica crece.

Ventajas:

- cada componente tiene una responsabilidad clara
- el state compartido queda centralizado en un servicio
- la lógica de negocio se vuelve más testeable
- se evita duplicar código entre formulario y listado

Desventajas:

- el flujo puede ser más difícil de seguir si no se documenta bien
- hay más archivos para rastrear
- requiere una arquitectura clara para no sentirse caótica

---

## 7. Regla de crecimiento

Si se agrega una nueva sección del admin, se recomienda mantener esta misma estructura:

```text
pages/admin/
└── nombre-seccion/
    ├── nombre-seccion.component.*
    ├── tabs/
    ├── formulario/
    ├── listado/
    └── servicio-crud si hace falta
```

Esto permite mantener el proyecto ordenado y escalable.

---

## 8. Recomendación final

La arquitectura actual es válida para un proyecto Angular de mediana complejidad, siempre que se mantenga clara y documentada.

El punto crítico no es la cantidad de archivos, sino la separación consistente de responsabilidades.