# WildeCinemas

Aplicación web para consultar la cartelera y comprar entradas de cine. Está desarrollada con Angular y utiliza Supabase para autenticación y persistencia.

## Funcionalidades

- Cartelera con búsqueda por título y filtro por género, detalle de películas, reseñas y próximos estrenos con alertas.
- Selección de butacas con reservas temporales sincronizadas entre usuarios y compra de entradas.
- Ticket con código QR y descarga en PDF.
- Historial personal de películas, entradas y alertas para usuarios registrados.
- Validación de códigos QR para entradas y Candy Bar, disponible para empleados y administradores.
- Panel administrativo para gestionar películas, funciones, salas, usuarios, configuración y reportes.

## Tecnologías

- Angular 22 con componentes standalone, Angular Router, signals y computed.
- TypeScript y RxJS.
- Supabase Auth, PostgreSQL, políticas RLS, RPC, Realtime, Storage y Edge Functions.
- jsPDF para generar tickets en PDF y `qrcode` para los códigos QR.
- Vitest para las pruebas automatizadas.

## Arquitectura

El recorrido habitual de una operación es:

```text
Usuario → Componente Angular → Servicio → Cliente Supabase compartido
                                             ↓
                            Auth / PostgreSQL / Storage / Edge Functions
                                             ↓
                    Respuesta → Servicio → Signals del componente → Vista
```

### Componentes y estado

Las pantallas son componentes standalone cargados mediante `loadComponent` en `app.routes.ts`. El layout contiene navegación y pie de página. Los componentes reciben acciones del usuario, mantienen estado mediante `signal` y calculan valores derivados mediante `computed`.

`AdminComponent` organiza películas, salas, funciones, configuración, usuarios y reportes mediante una sección activa. Son componentes internos del panel `/admin`, no rutas hijas independientes.

Los formularios combinan el enfoque reactivo en registro y formularios basados en plantilla en varias pantallas simples y administrativas. `SelectorFechaComponent` permite editar día, mes y año sin calendario y se integra con ambos enfoques mediante `ControlValueAccessor`. Los pipes compartidos presentan fechas y moneda.

### Servicios y dependencias

| Servicio | Responsabilidad y consumidores principales |
| --- | --- |
| `AuthService` | Crea el cliente Supabase, autentica y coordina perfil y sesión. Lo usan formularios, guards, layout y servicios de datos. |
| `PerfilService` | Consulta y mantiene el perfil; recibe cliente y usuario desde Auth. |
| `SesionService` | Controla la duración local; recibe funciones para consultar el usuario y cerrar la sesión desde Auth. |
| `PeliculasService` | Consulta y modifica películas para inicio, detalle y administración. |
| `PeliculasCrudService` | Mantiene formulario, edición y estado administrativo; utiliza PeliculasService. |
| `SalasFuncionesService` | Gestiona salas, funciones y precio base para detalle y administración. |
| `ButacasService` | Consulta asientos, reserva/libera butacas y crea el canal Realtime para la selección. |
| `ComprasService` | Envía la compra a una RPC y adapta su respuesta al comprobante. |
| `ReseniasService` | Consulta reseñas y promedios y guarda calificaciones para inicio y reseñas de películas. |
| `ExperienciaClienteService` | Ranking, alertas, historial y cancelaciones para inicio y Mis películas. |
| `CuponesService` | Consulta y administra promociones para configuración e inicio. |
| `ImagenesService` | Valida y sube pósters desde el formulario de películas. |
| `ReportesService` | Consulta ventas y auditoría y descarga CSV para AdminReportes. |

Los servicios de datos reutilizan `AuthService.client`. Algunos componentes realizan llamadas específicas directamente: AdminUsuarios invoca una Edge Function, ValidarQr llama a su RPC y Butacas retira el canal Realtime al destruirse.

### Backend y autorización

`AuthService` crea una instancia de Supabase usando la configuración de `src/environments`. Supabase Auth identifica al usuario; PostgreSQL conserva los datos; Storage almacena pósters; Realtime avisa sobre cambios en reservas.

Los guards controlan navegación y la directiva `soloAdmin` y condiciones del HTML controlan visibilidad. La autorización de los datos se comprueba en el backend mediante RLS y controles en RPC y Edge Functions.

Las RPC agrupan operaciones como compra, reservas, asignación automática de salas, cancelaciones y eliminación de salas. Los triggers y registros explícitos alimentan la auditoría.

### Flujos principales

1. **Consulta:** Inicio carga cartelera, estrenos y ranking; el detalle consulta película, funciones y reseñas.
2. **Autenticación:** Auth recupera o inicia sesión, carga el perfil y activa el control local de duración. Los guards esperan su inicialización antes de evaluar permisos.
3. **Compra:** Butacas obtiene disponibilidad y solicita reservas temporales. Realtime y una consulta cada 15 segundos refrescan el mapa. Compras envía la selección a la RPC, que valida y devuelve el comprobante.
4. **Ticket:** el comprobante se entrega mediante navegación y se respalda en `sessionStorage`. Ticket genera QR y PDF.
5. **Experiencia personal:** Mis películas consulta historial y alertas; las cancelaciones elegibles se procesan en el servidor y se recarga el perfil.
6. **Administración:** los módulos gestionan datos mediante servicios o llamadas específicas al backend. La creación de usuarios con rol utiliza una Edge Function.
7. **Reportes:** el componente calcula Hoy, 7 o 30 días y solicita cuatro RPC mediante ReportesService. Las ventas usan el período; la auditoría reciente no recibe ese filtro. El CSV contiene ventas diarias y el PDF utiliza la impresión del navegador.

## Estructura del proyecto

- `src/app/pages/`: pantallas de inicio, autenticación, películas, compra, historial y administración.
- `src/app/core/services/`: autenticación, perfil, sesión, datos del cine, compras, reportes y estado compartido.
- `src/app/core/guards/`: protección de rutas según autenticación y rol.
- `src/app/layout/`: navegación y estructura compartida, incluido el pie de página.
- `src/app/shared/`: componentes, pipes y elementos reutilizables.
- `src/app/models/`: modelos de películas, cine, órdenes y usuarios.
- `src/environments/`: configuración de conexión al proyecto Supabase.
- `supabase/sql/`: scripts parciales de cambios del backend.
- `supabase/functions/`: Edge Function de creación administrativa de usuarios.
- `supabase/tests/`: comprobaciones SQL de alertas.

## Requisitos y ejecución

Se requiere Node.js y npm. Desde la carpeta del proyecto:

```bash
npm install
npm start
```

La aplicación queda disponible en `http://localhost:4200/`. Los archivos de entorno están excluidos de Git y deben configurarse localmente con `supabaseUrl` y `supabaseKey`. Desarrollo reemplaza `environment.ts` por `environment.development.ts` mediante `angular.json`.

Para compilar:

```bash
npm run build
```

## Rutas

| Ruta | Uso | Acceso |
| --- | --- | --- |
| `/` | Inicio y cartelera | Público |
| `/login` | Inicio de sesión y registro | Público |
| `/pelicula/:id` | Detalle y reseñas de una película | Público |
| `/funciones/:id/butacas` | Selección de butacas y compra | Sin guard; el servidor valida la compra |
| `/ticket/:id` | Ticket de una compra | Sin guard; requiere comprobante en navegación o almacenamiento de la pestaña |
| `/mis-peliculas` | Entradas, historial y alertas | Usuario autenticado |
| `/validar-qr` | Validación de entradas o Candy Bar | Empleado o administrador |
| `/admin` | Herramientas de administración | Administrador |

## Supabase

La aplicación espera un proyecto Supabase configurado y utiliza las tablas, políticas RLS y funciones RPC que respaldan las operaciones del cine. La conexión se configura en `src/environments/environment.ts` y `src/environments/environment.development.ts`.

El repositorio no incluye una migración completa para crear el backend desde cero. Se necesitan las tablas, políticas, RPC y triggers existentes. Revisar dependencias antes de aplicar los cambios incluidos:

- [eliminar-sala-sin-funciones.sql](supabase/sql/eliminar-sala-sin-funciones.sql): comprueba administración y elimina sala y butacas atómicamente si no hay funciones asociadas.
- [cupones-configurables.sql](supabase/sql/cupones-configurables.sql): configuración de primera compra, cupones y adaptación de la compra.
- [imagenes-y-auditoria-descuentos.sql](supabase/sql/imagenes-y-auditoria-descuentos.sql): bucket, políticas y triggers; requiere las tablas y función de auditoría existentes.
- [crear-usuario-privilegiado](supabase/functions/crear-usuario-privilegiado/index.ts): Edge Function que debe desplegarse con su configuración de servidor.

La sincronización requiere incluir la tabla de reservas en la publicación de Supabase Realtime. Las claves privilegiadas como `service_role` pertenecen al servidor y no deben colocarse en Angular.

## Comandos disponibles

- `npm start`: inicia el servidor de desarrollo.
- `npm run build`: genera la compilación de la aplicación.
- `npm test`: ejecuta las pruebas configuradas con Vitest.
- `npm test -- --watch=false`: ejecuta las pruebas una vez.
- `npm run build -- --configuration development`: compila en modo desarrollo.

## Alcance actual

- La compra se confirma en el backend sin pasarela de pago externa.
- La primera compra tiene un porcentaje configurable y los cupones pueden restringirse a mayores de 50 años.
- Los pósters pueden cargarse desde la PC o mediante URL.
- La duración máxima de siete minutos se controla en el navegador; no es un límite configurado en Supabase.
- Las alertas se consultan dentro de la aplicación; no envían correo ni notificaciones push.
- El Candy Bar administrativo y el canje de puntos no tienen una experiencia completa. El crédito existe, pero no se usa como medio de pago en la compra actual.
- Reportes descarga CSV compatible con Excel, no `.xlsx`, y utiliza impresión para guardar PDF. Los tickets utilizan jsPDF.
- Un enlace de ticket abierto en otro navegador no recupera automáticamente el comprobante desde el servidor.

## Documentación técnica

Consultar [Decisiones técnicas](docs/decisiones-tecnicas.md) para conocer los motivos y límites de las soluciones implementadas.
