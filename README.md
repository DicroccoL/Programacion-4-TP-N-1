# WildeCinemas

Aplicación web de cine desarrollada con Angular y Supabase. Este README describe cómo está organizada la aplicación actualmente.

## Arquitectura

La aplicación usa componentes standalone y navegación con Angular Router. `AppLayoutComponent` contiene la estructura común (navegación y `router-outlet`); el router carga la página correspondiente a cada URL.

| Ruta | Página | Acceso |

| `/` | Inicio y cartelera | Público |
| `/login` | Inicio de sesión y registro | Público |
| `/pelicula/:id` | Detalle de película | Público |
| `/funciones/:id/butacas` | Mapa y compra de butacas | Público, con reserva concurrente |
| `/ticket/:id` | Ticket visual con QR y descarga PDF | Se accede al crear la orden |
| `/mis-peliculas` | Historial y alertas personales | Usuario autenticado |
| `/validar-qr` | Validación de entradas y Candy Bar | Empleado o administrador |
| `/admin` | Panel de administración | Solo admin, mediante `adminGuard` |

### Capas principales

- `pages/`: pantallas organizadas por funcionalidad: inicio, autenticación, detalle y administración.
- `layout/`: estructura compartida alrededor de las páginas.
- `shared/`: componentes reutilizables, como la tarjeta de película.
- `core/services/`: sesión/autenticación (`AuthService`), acceso a películas (`PeliculasService`) y estado del CRUD del administrador (`PeliculasCrudService`).
- `core/guards/` y `core/directivas/`: control de acceso a rutas y elementos de interfaz.
- `models/`: tipos del dominio usados por las pantallas y servicios.

### Datos y flujo de películas

`AuthService` crea el cliente de Supabase y mantiene la sesión y el perfil. `PeliculasService` consulta y persiste películas, y adapta los registros a los modelos de la aplicación. Inicio y detalle consumen ese servicio directamente.

En `/admin`, `AdminComponent` selecciona la sección. Para películas, `AdminPeliculasComponent` coordina formulario y listado; ambos comparten el estado y las operaciones mediante `PeliculasCrudService`, que delega la persistencia a `PeliculasService`.


## Ejecutar el proyecto

Requiere Node.js y npm. Instalar dependencias y levantar el servidor local:

```bash
npm install
npm start
```

Para generar la compilación de producción: `npm run build`.

## Documentación relacionada


- [Decisiones técnicas](DECISIONES_TECNICAS.md): motivos de las decisiones principales y límites actuales.
- [Flujos de salas, funciones y butacas](FLUJOS_Y_DECISIONES_TECNICAS.md): configuración SQL, reglas de asignación y decisiones de reservas concurrentes.
- [RPC administrativas de funciones](supabase/sql/funciones-admin.sql): SQL acotado para habilitar eliminación y actualización global de precios.
- [Funciones de historial, puntos y reportes](supabase/sql/pendientes-consigna.sql): SQL idempotente para los flujos incorporados desde octubre de 2026.
- [Comprobante de compra con QR](supabase/sql/comprobante-compra-qr.sql): RPC segura para devolver el comprobante de la orden al finalizar la selección de butacas. Debe ejecutarse en Supabase antes de usar el nuevo flujo.
- [Edge Function para altas privilegiadas](supabase/functions/crear-usuario-privilegiado/index.ts): creación segura de usuarios empleado/admin desde el panel.
- [Flujo de administración](src/app/pages/admin/README.md): detalle del CRUD de películas.

## Configuración de reseñas en Supabase

Antes de usar las reseñas, ejecutar una vez el script [resenias.sql](supabase/sql/resenias.sql) desde el SQL Editor de Supabase. Configura la reseña única por usuario y película, las políticas de acceso y la función que calcula los promedios. Revisar las políticas RLS existentes antes de aplicarlo.
