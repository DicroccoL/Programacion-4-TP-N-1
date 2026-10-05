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

- Angular standalone y Angular Router.
- TypeScript y RxJS.
- Supabase Auth, base de datos PostgreSQL, RPC y Realtime.
- jsPDF para generar tickets en PDF y `qrcode` para los códigos QR.

## Estructura del proyecto

- `src/app/pages/`: pantallas de inicio, autenticación, películas, compra, historial y administración.
- `src/app/core/services/`: autenticación, acceso a películas, programación, reseñas y experiencia del cliente.
- `src/app/core/guards/`: protección de rutas según autenticación y rol.
- `src/app/layout/`: navegación y estructura compartida, incluido el pie de página.
- `src/app/shared/`: componentes, pipes y elementos reutilizables.
- `src/app/models/`: modelos de películas, cine, órdenes y usuarios.
- `src/environments/`: configuración de conexión al proyecto Supabase.

## Requisitos y ejecución

Se requiere Node.js y npm. Desde la carpeta del proyecto:

```bash
npm install
npm start
```

La aplicación queda disponible en `http://localhost:4200/`. Para compilar:

```bash
npm run build
```

## Rutas

| Ruta | Uso | Acceso |
| --- | --- | --- |
| `/` | Inicio y cartelera | Público |
| `/login` | Inicio de sesión y registro | Público |
| `/pelicula/:id` | Detalle y reseñas de una película | Público |
| `/funciones/:id/butacas` | Selección de butacas y compra | Público; las reglas de edad se validan durante la compra |
| `/ticket/:id` | Ticket de una compra | Navegación posterior a la compra |
| `/mis-peliculas` | Entradas, historial y alertas | Usuario autenticado |
| `/validar-qr` | Validación de entradas o Candy Bar | Empleado o administrador |
| `/admin` | Herramientas de administración | Administrador |

## Supabase

La aplicación espera un proyecto Supabase configurado y utiliza las tablas, políticas RLS y funciones RPC que respaldan las operaciones del cine. La conexión se configura en `src/environments/environment.ts` y `src/environments/environment.development.ts`.

El repositorio no incluye la configuración completa de Supabase ni todos los scripts SQL que necesita la aplicación; esos elementos deben obtenerse o configurarse por separado. Sí incluye [el script para eliminar salas sin funciones asociadas](supabase/sql/eliminar-sala-sin-funciones.sql): ejecutalo una vez en el SQL Editor de Supabase antes de usar esa acción. El script comprueba el rol administrador y elimina la sala junto con sus butacas en una operación atómica. No se debe colocar una clave `service_role` en el cliente Angular.

## Comandos disponibles

- `npm start`: inicia el servidor de desarrollo.
- `npm run build`: genera la compilación de la aplicación.
- `npm test`: ejecuta las pruebas configuradas con Vitest.
