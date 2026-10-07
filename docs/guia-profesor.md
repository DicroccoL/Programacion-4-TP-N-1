# WildeCinemas: guía para explicar y defender el proyecto

Revisión del 6 de octubre de 2026. Basada en el código del repositorio y en las funciones y triggers consultados en el proyecto Supabase `cefoinitqwhfushrcmtd`.

## 1. La idea general y quién depende de quién

La aplicación tiene una interfaz Angular y un servidor compuesto por Supabase Auth, PostgreSQL, Storage, Realtime y una Edge Function. Angular muestra pantallas y recoge datos. Los servicios agrupan consultas y adaptan resultados. PostgreSQL controla las reglas que deben cumplirse aunque alguien saltee la interfaz: permisos, disponibilidad de salas, reservas, descuentos y validación de QR.

Una operación habitual sigue este recorrido:

```text
Acción del usuario
  → evento de un componente
  → método de un servicio Angular
  → cliente Supabase compartido de AuthService
  → tabla con RLS o función SQL (RPC)
  → respuesta o error
  → actualización de signals
  → Angular vuelve a mostrar los datos
```

El servicio no llama a un componente para modificar su HTML. Devuelve una Promise y el componente actualiza su estado. `signal` contiene un valor; `computed` calcula un valor derivado; `effect` reacciona a cambios para realizar un efecto. Los decoradores `@Injectable({providedIn:'root'})` hacen que los servicios estén disponibles mediante inyección y normalmente compartan una instancia en la aplicación.

### Dependencias reales

| Consumidor | Dependencias | Qué obtiene o solicita |
|---|---|---|
| App / AppLayout | AuthService, Router, SoloAdminDirective | Navegación, sesión, nombre y enlaces por rol |
| AuthComponent | AuthService; contiene Login y Registro | Procesa los datos emitidos por los formularios |
| Inicio | PeliculasService, ReseniasService, ExperienciaClienteService, CuponesService, AuthService | Cartelera, próximos estrenos, promedios, ranking, alertas y promoción vigente |
| TarjetaPelicula | Inputs del padre, RouterLink, DecimalPipe | Presenta una película y su puntuación; no consulta Supabase |
| DetallePelicula | PeliculasService, SalasFuncionesService; contiene Reseñas | Película y funciones futuras; permite elegir función |
| ReseniasPelicula | ReseniasService, AuthService | Consulta reseñas y guarda la del usuario |
| Butacas | SalasFuncionesService, ButacasService, ComprasService, AuthService | Carga función, reserva asientos, confirma compra y prepara navegación al ticket |
| Ticket | Datos de navegación/sessionStorage, qrcode, jsPDF | Muestra y descarga el comprobante; no crea otra compra |
| MisPeliculas | ExperienciaClienteService, AuthService | Historial, alertas, puntos, crédito y cancelaciones |
| ValidarQr | AuthService.client directamente | Invoca `validar_qr_orden` |
| AdminPeliculas / Formulario / Listado | PeliculasCrudService → PeliculasService | Comparten estado del CRUD; el formulario también usa ImagenesService |
| AdminSalas / AdminFunciones / AdminConfiguracion | SalasFuncionesService | Salas, programación y precio global |
| AdminCupones | CuponesService | Configura primera compra y cupones |
| AdminUsuarios | AuthService.client.functions directamente | Invoca la Edge Function de creación de personal |
| AdminReportes | ReportesService | Filtros, ventas, actividad reciente, CSV e impresión |

La división por servicios evita repetir consultas. `PeliculasCrudService` agrega estado de administración sobre `PeliculasService`, que se ocupa del acceso a datos. `SalasFuncionesService` conserva planificación; butacas y compras tienen servicios propios. El antiguo nombre `ProgramacionService` fue reemplazado por `SalasFuncionesService`.

## 2. Recorrido de la aplicación de principio a fin

1. Angular inicia y muestra AppLayout. El Router carga las pantallas con `loadComponent`, por lo que sus archivos se cargan al necesitarse.
2. AuthService crea el cliente Supabase y consulta si había una sesión. Valida su antigüedad y carga el perfil si sigue vigente.
3. Inicio consulta cartelera y próximos estrenos en paralelo. Después obtiene ranking, alertas y resúmenes de reseñas. Un fallo en el ranking o las reseñas no oculta toda la cartelera.
4. El usuario puede buscar por título y filtrar por género. `peliculasFiltradas` usa `computed`; filtra las películas cargadas en memoria, sin consultar la base en cada tecla.
5. Una tarjeta lleva a `/pelicula/:id`. Detalle lee el parámetro, consulta la película y sus funciones futuras. La compra se habilita si está en cartelera o tiene preventa activa.
6. Elegir una función lleva a `/funciones/:id/butacas`. Esta ruta permite visitantes; iniciar sesión agrega historial, puntos y acceso a cupones.
7. Butacas obtiene la sala, sus asientos, las butacas compradas y las reservas activas. Abre una suscripción Realtime y consulta cada 15 segundos como respaldo.
8. Al seleccionar una butaca se llama a `tomar_reserva_butaca`. Solo se agrega a la selección cuando Supabase confirma la reserva. Se pueden seleccionar hasta ocho.
9. Al comprar se manda función, butacas, token, datos de clasificación y código de cupón. El navegador no manda un total para que el servidor lo acepte: PostgreSQL calcula los importes.
10. `comprar_orden_con_comprobante` valida descuentos y utiliza `crear_orden_butacas_pendiente`. Esta última valida reservas y clasificación, crea orden y entradas. La función exterior aplica el descuento, marca la orden `PAGADA`, acredita puntos y libera reservas. Todo ocurre dentro de la transacción de la RPC.
11. Angular recibe un comprobante, recarga el perfil para reflejar puntos y lo guarda en `sessionStorage` y en el estado de navegación. Navega a `/ticket/:id`.
12. Ticket recupera esos datos, convierte `codigo_qr` en imagen y permite descargar el PDF. Abrir esa ruta en otra sesión sin el comprobante guardado no recupera automáticamente la compra desde el servidor.
13. Mis películas requiere sesión. Consulta órdenes pagadas y alertas; muestra puntos y crédito del perfil. Puede cancelar una orden propia con más de dos horas de anticipación.
14. Empleados y administradores validan el QR. La RPC comprueba que la orden esté pagada, que tenga entradas o productos según el tipo, y que ese uso del código no se haya consumido.

**Detalle para el oral:** el sitio todavía no integra una pasarela de pago. El flujo actual de compra marca automáticamente la orden como pagada. Se retiró la herramienta administrativa de pendientes y confirmación manual porque ya no corresponde a ese flujo. No describas esto como un cobro bancario implementado.

Rutas y guards: [app.routes.ts](C:/Users/uld001/Desktop/Programacion-4-TP-N-1/src/app/app.routes.ts).

## 3. Formularios de Angular: cuáles hay y cuáles usamos

Las dos familias tradicionales son **template-driven** y **reactivos**. La documentación actual también incorpora **Signal Forms**. Este proyecto usa las dos tradicionales; tener signals en un componente no significa usar Signal Forms. [Comparación oficial de Angular](https://angular.dev/guide/forms/signals/comparison).

| Tipo | Cómo se construye | Dónde se usa en el proyecto | Motivo |
|---|---|---|---|
| Template-driven | FormsModule, `[(ngModel)]`, `name`, NgForm y atributos de validación | Login, películas, reseñas, usuarios admin, salas, funciones, configuración, cupones y datos de butacas | Formularios sencillos y cercanos a su plantilla |
| Reactivo | ReactiveFormsModule, FormBuilder, FormGroup, controles y Validators definidos en TypeScript | RegistroComponent | Varios campos con reglas y mensajes; permite controlar estado y validación desde la clase |
| Signal Forms | Modelo basado en signals y API específica de formularios | No se usa | No hace falta migrar para explicar el código existente |

### Registro

`RegistroComponent` crea `registerForm` con `fb.nonNullable.group`. Usa `required`, `minLength`, `email`, `min` y `max`. `onSubmit` consulta `invalid`; si hay errores, `markAllAsTouched` hace visibles los mensajes. Si pasa, emite `registerSubmit` al padre. El padre llama a AuthService.register.

### Administración de usuarios

El formulario usa `#formulario="ngForm"` y `crear(formulario)`. `required` detecta vacío, pero por sí solo acepta espacios. Por eso nombre, apellido y contraseña tienen un patrón que exige algún carácter no blanco; además `crear` valida los valores recortados antes de invocar el servidor. La Edge Function repite la validación: modificar el HTML no permite omitirla.

Solo se piden **nombre, apellido, correo, contraseña y rol**. La contraseña mínima de personal es ocho caracteres. No se recorta la contraseña antes de guardarla, porque los espacios pueden formar parte de una contraseña válida; se rechaza que sea únicamente espacios.

### El selector de fecha

`SelectorFechaComponent` implementa `ControlValueAccessor`: es el puente entre el control personalizado y NgModel/FormControlName. `writeValue` recibe el valor del formulario; `registerOnChange` comunica cambios hacia el formulario; `registerOnTouched` comunica interacción; `setDisabledState` permite deshabilitarlo. Divide día, mes y año, selecciona un segmento al enfocarlo y devuelve `YYYY-MM-DD` cuando la fecha está completa y es real. Si es inválida o incompleta devuelve cadena vacía.

Se usa en registro, estreno de película, datos de clasificación de butacas y programación de funciones. En programación la fecha usa el selector y la hora un control `time`. El selector no abre un calendario. Reportes calcula las fechas automáticamente mediante los botones Hoy (por día), últimos 7 días y últimos 30 días; no tiene campos de fechas manuales.

**Límite actual:** en un campo opcional, una fecha incompleta puede llegar como vacío. Eso no convierte al selector en un validador general de todos los formularios; los campos obligatorios necesitan `required` y las reglas de negocio correspondientes.

Archivos: [registro.component.ts](C:/Users/uld001/Desktop/Programacion-4-TP-N-1/src/app/pages/auth/registro/registro.component.ts), [admin-usuarios.component.ts](C:/Users/uld001/Desktop/Programacion-4-TP-N-1/src/app/pages/admin/usuarios/admin-usuarios.component.ts), [selector-fecha.component.ts](C:/Users/uld001/Desktop/Programacion-4-TP-N-1/src/app/shared/components/selector-fecha/selector-fecha.component.ts).

## 4. Directivas: tipos y ejemplos concretos

Angular distingue componentes (directivas con plantilla), directivas de atributo (agregan comportamiento a un elemento) y estructurales (crean o quitan vistas). [Documentación de directivas](https://angular.dev/guide/directives).

| Ejemplo real | Tipo / función | Ubicación |
|---|---|---|
| `*soloAdmin` | Estructural propia; crea o elimina la vista según el rol | Enlace Admin de AppLayout |
| `ngModel`, `ngForm` | Directivas de formularios; relacionan controles, datos y estado | Formularios template-driven |
| `formGroup`, `formControlName` | Directivas de formularios reactivos | Registro |
| `required`, `minlength`, `pattern`, `email` en controles Angular | Aplican validadores al control cuando corresponde | Formularios de registro/admin/películas |
| `routerLink`, `routerLinkActive` | Navegación y estado del enlace | Layout, tarjetas y enlaces entre pantallas |
| `router-outlet` | Directiva que hospeda la pantalla de la ruta activa | Layout |

`SoloAdminDirective` inyecta `TemplateRef`, `ViewContainerRef` y AuthService. Un `effect` observa `isAdmin()`. Si pasa a verdadero, `createEmbeddedView` crea el enlace; si pasa a falso, `clear` lo quita. `hasView` evita crearlo varias veces.

**No confundas sintaxis:** `@if`, `@for` y `@switch` son bloques de control de flujo integrados de Angular. No son nuestra directiva `soloAdmin`. `[class.activo]`, `[style.width.%]`, `[disabled]` y `(click)` son bindings de clase/estilo/propiedad/evento, no nombres de directivas creadas por nosotros.

La directiva solo cambia lo visible. El guard protege la navegación, y las políticas/RPC protegen los datos en el servidor. Son tres capas con responsabilidades distintas.

Archivo: [solo-admin.directive.ts](C:/Users/uld001/Desktop/Programacion-4-TP-N-1/src/app/core/directivas/solo-admin.directive.ts).

## 5. Conexión con Supabase: todos los puntos

### Cliente principal de Angular

Está en el constructor de [AuthService](C:/Users/uld001/Desktop/Programacion-4-TP-N-1/src/app/core/services/auth.service.ts): `createClient(environment.supabaseUrl, environment.supabaseKey)`. Los valores vienen de los archivos de `src/environments`. El getter `client` comparte esa instancia. Los otros servicios Angular no crean cada uno una conexión independiente.

| Forma de uso | Qué hace | Dónde aparece |
|---|---|---|
| `client.auth` | Login, registro, sesión y cierre | AuthService |
| `client.from('tabla')` | Lectura/escritura de datos, sujeta a RLS | PeliculasService, ReseniasService, ButacasService, ExperienciaClienteService y CuponesService; PerfilService lee perfiles usando el cliente que le pasa AuthService |
| `client.rpc('funcion')` | Ejecuta una función PostgreSQL | SalasFuncionesService, ButacasService, ComprasService, ReseniasService, ExperienciaClienteService y ReportesService; directamente ValidarQr |
| `client.channel(...).on(...).subscribe()` | Recibe avisos de cambios | ButacasService |
| `client.removeChannel(...)` | Cierra la suscripción al salir | ButacasComponent.ngOnDestroy |
| `client.functions.invoke(...)` | Ejecuta lógica del servidor con permisos de servidor | AdminUsuariosComponent |
| `client.storage.from(...).upload(...)` | Sube pósters; devuelve URL pública | ImagenesService |

### Clientes de la Edge Function

La función [crear-usuario-privilegiado/index.ts](C:/Users/uld001/Desktop/Programacion-4-TP-N-1/supabase/functions/crear-usuario-privilegiado/index.ts) crea dos clientes en el servidor. Uno utiliza el token del solicitante para verificar quién es. Otro usa `SUPABASE_SERVICE_ROLE_KEY` de los secretos de Supabase para crear usuarios y asignar roles. Primero verifica en `perfiles` que el solicitante sea administrador. La clave de servidor no forma parte del código Angular.

RLS significa políticas por fila: decide qué registros puede leer o modificar una identidad. En las funciones `SECURITY DEFINER`, los permisos del dueño de la función hacen imprescindible verificar al usuario/rol dentro de la función cuando corresponda. [RLS en Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).

Las funciones SQL actuales pueden estudiarse en [Database → Functions del proyecto](https://supabase.com/dashboard/project/cefoinitqwhfushrcmtd/database/functions). El repositorio no tenía una copia de todas las migraciones históricas: varios mensajes de error mencionan archivos SQL que no están presentes. No confundir esas referencias con archivos que realmente existen.

## 6. Pipes: qué transforman y qué validan realmente

Un pipe transforma un valor para mostrarlo en la plantilla mediante `valor | nombre`. Nuestros pipes implementan `PipeTransform` y su método `transform`. No reemplazan la validación de un formulario ni los controles del servidor. [Guía de pipes](https://angular.dev/guide/templates/pipes).

### FechaArgentinaPipe

Archivo: [fecha-argentina.pipe.ts](C:/Users/uld001/Desktop/Programacion-4-TP-N-1/src/app/shared/pipes/fecha-argentina.pipe.ts).

Recibe string, Date, null o undefined. Vacío devuelve vacío. Para `YYYY-MM-DD`, separa las partes y comprueba que el día exista realmente; rechaza, por ejemplo, 29/02 de un año no bisiesto. No trata una fecha sin hora como un instante UTC que después desplazaría al día anterior en Argentina. Para instantes con hora, usa Buenos Aires y devuelve `DD/MM/AAAA`; `fechaArgentina: true` agrega `HH:mm`.

Se usa en detalles, reseñas, funciones, butacas y reportes; Ticket y MisPeliculas también reutilizan su método transform para mostrar fechas. La comprobación defensiva evita mostrar fechas inválidas; **no decide si alguien tiene edad suficiente ni si una función puede programarse**.

### MonedaArgentinaPipe

Archivo: [moneda-argentina.pipe.ts](C:/Users/uld001/Desktop/Programacion-4-TP-N-1/src/app/shared/pipes/moneda-argentina.pipe.ts).

Usa `Intl.NumberFormat('es-AR', {style:'currency',currency:'ARS',maximumFractionDigits:0})`. Sirve en precios de funciones, butacas y ticket. Null/undefined se muestran como cero. No valida saldo suficiente, descuentos ni precios positivos. Tampoco contiene una regla especial contra NaN/Infinity. La visualización redondea a pesos enteros; los importes de PostgreSQL pueden conservar dos decimales.

### DecimalPipe de Angular

Se importa en TarjetaPelicula y ReseniasPelicula. La plantilla utiliza `number` para presentar los promedios con una cantidad de decimales. No es un pipe propio.

## 7. AuthService: explicación detallada

### Separación para estudiar cada responsabilidad

- **AuthService:** crea el cliente Supabase, coordina login/registro/logout y mantiene el usuario y las consultas de rol.
- **PerfilService:** consulta `perfiles`, transforma sus campos y mantiene `currentProfile`. AuthService expone esa misma señal, sin copiarla.
- **SesionService:** guarda el inicio, comprueba los siete minutos y programa el vencimiento. No crea un cliente Supabase ni consulta perfiles.

Los componentes y guards siguen inyectando AuthService. Este inyecta PerfilService y SesionService. PerfilService recibe el cliente compartido y el usuario como argumentos de `cargar`. SesionService recibe dos funciones mediante `configurar`: una para consultar el UUID actual y otra para pedir el cierre local. Así ninguno de los dos necesita inyectar AuthService y se evita una dependencia circular.

**Login:** componente → AuthService.login → Supabase.signInWithPassword → SesionService.iniciar → actualizar currentUser → PerfilService.cargar → actualizar currentProfile → menú y guards consultan los roles.

**Actualizar página:** AuthService.initAuth → Supabase.getSession → SesionService.recuperar → si sigue vigente, cargar usuario/perfil; si venció o no hay marca, cerrar sesión.

**Vencimiento:** temporizador o regreso a la pestaña → SesionService.verificar → SesionService.cerrar → función de cierre de AuthService → Supabase.signOut local → limpiar usuario/perfil → Router.navigate al inicio → limpiar marca.

PerfilService identifica sus consultas con una versión. Si se cierra sesión o se inicia otra consulta, una respuesta anterior ya no puede sobrescribir el perfil actual. Esto evita mostrar datos viejos después del logout o de una recarga más reciente.

### Dos identidades relacionadas

`currentUser` contiene el usuario de Supabase Auth: identifica la sesión. `currentProfile` contiene su fila de `perfiles`: nombre, apellido, rol, nacimiento, saldo, puntos y primera compra. La clave de esa fila es el mismo UUID que el usuario Auth. Un usuario autenticado no debe confundirse con un usuario autorizado como administrador.

`isLoggedIn`, `userRole`, `isAdmin`, `isEmpleado` e `isCliente` son `computed`; se recalculan al cambiar sus signals de origen. `isLoading` indica una operación en curso para deshabilitar formularios.

### Métodos y secuencia

| Método | Para qué está y quién lo utiliza |
|---|---|
| constructor | Crea cliente, configura SesionService e inicia `initAuth` |
| initAuth | Recupera sesión con getSession; comprueba su marca de inicio; carga perfil y escucha onAuthStateChange |
| whenReady | Espera la inicialización y revisa vencimiento; lo usan guards y páginas privadas/dependientes de sesión |
| PerfilService.cargar | Lee perfiles por UUID; adapta snake_case a camelCase y valores numéricos; si no obtiene fila, utiliza datos de metadata y valores de respaldo |
| login | signInWithPassword → marca inicio local → usuario → perfil; devuelve success/error y finaliza loading |
| register | signUp con metadata de cliente; el trigger crea perfiles; solo carga una sesión inmediata si Supabase devuelve session |
| refreshCurrentProfile | Recarga saldo/puntos del perfil; se usa después de comprar o cancelar |
| logout | signOut, limpia usuario/perfil y temporizador/marca local |
| client | Da acceso al cliente compartido; no crea otra instancia |
| mensajeErrorRegistro | Traduce ciertos errores de registro a mensajes más útiles |

### Registro y rol

RegistroComponent valida y emite datos → AuthComponent.handleRegister → AuthService.register → Supabase Auth crea la cuenta → trigger `on_auth_user_created` ejecuta `handle_new_user` → crea `perfiles` con rol **cliente**. El trigger no acepta que el cliente se autoproclame admin mediante metadata.

En el alta de personal, la Edge Function comprueba al administrador, crea Auth, deja que el trigger cree el perfil y luego asigna el rol pedido con el cliente de servidor. Verifica el resultado. Si no consigue asignar el rol, intenta retirar la cuenta recién creada para no informar un alta incompleta. Registra `CREAR_USUARIO_PRIVILEGIADO` sin guardar la contraseña en el log.

**Detalle del respaldo:** PerfilService todavía consulta `user_metadata.rol` si no obtiene rol de perfiles. Eso puede influir en la interfaz; la autorización real debe seguir dependiendo del rol comprobado en PostgreSQL. Nunca presentar ese respaldo como mecanismo de seguridad del servidor.

### Sesión de siete minutos

En SesionService, `DURACION_MAXIMA_MS = 7 * 60 * 1000`. La marca `wildecinemas.session.startedAt` guarda `{userId,inicio}` en localStorage. `leerInicio` valida la estructura; `vencida` compara con Date.now; `programar` programa el tiempo restante. Cuando vence, `cerrar` pide a AuthService que ejecute `cerrarSesionLocal`, que llama a `signOut({scope:'local'})` y limpia usuario/perfil. SesionService limpia el reloj y la marca. `visibilitychange` comprueba al volver a la pestaña. Renovar el token no reinicia esa marca.

Este límite está implementado en el navegador. No equivale a una caducidad de sesión impuesta por Supabase en el servidor. El tiempo de expiración del access token tampoco es por sí solo el tiempo total de la sesión, porque puede renovarse. No afirmar en el oral que se configuró un límite absoluto de servidor.

### Guards

`authGuard` espera whenReady y exige usuario para Mis películas. `adminGuard` exige isAdmin para Admin. `staffGuard` permite admin o empleado para validar QR. Los guards devuelven true o una redirección; no se encargan de conceder permisos de base de datos.

## 8. Experiencia del cliente: ranking, historial, reseñas y puntos

### Inicio y ranking

Inicio obtiene catálogo, próximos estrenos, promedios y top de ventas. `obtener_tres_peliculas_mas_vendidas` une entradas → órdenes → funciones → películas, cuenta entradas de órdenes `PAGADA`, ordena por cantidad y limita a tres. Por lo tanto es un ranking de entradas vendidas, no de puntuación de reseñas ni de visitas a la página. `indiceRanking` selecciona la película mostrada; `cambiarRanking` recorre circularmente la lista; un intervalo de cinco segundos cambia la selección y ngOnDestroy lo elimina.

### Reseñas

ReseniasService.obtenerResumenes devuelve promedios/cantidades para varias películas. obtenerPorPelicula devuelve reseñas con nombre del autor. guardar usa upsert con la combinación película/usuario y comentario vacío como null. El componente exige de una a cinco estrellas y permite editar la propia. No hay comprobación de compra en ese componente; no asegurar que solo los compradores pueden reseñar sin revisar también la política de resenias en Supabase.

### Mis películas

Consulta `obtener_mis_funciones_historial`, agrupa el resultado por orden/función y muestra película, butacas, importe, fecha, QR y puntaje propio. `puntos` y `credito` se derivan de currentProfile. Cancelar llama a `cancelar_mi_orden`, luego recarga perfil e historial.

La RPC de cancelación bloquea la orden (`FOR UPDATE`), exige que pertenezca a auth.uid(), que esté pagada y que falten más de dos horas. Cambia a CANCELADA, suma el total al saldo de crédito, resta los puntos generados sin bajar de cero y deja un log. No devuelve dinero a una tarjeta. En la compra actual de butacas `credito_usado` se inicia en cero: mostrar saldo no significa tener implementado su uso como medio de pago.

### Puntos

Los genera la RPC de compra: `floor(total)` para una cuenta identificada; cero para invitado. Por ejemplo, un total de 1.250,50 acredita 1.250 puntos. Se guardan en ordenes.puntos_generados y se suman a perfiles.puntos_fidelidad. El navegador solo los muestra. Al cancelar se descuentan los puntos de esa orden.

No existe un componente/servicio completo para canjear puntos en el flujo actual. Candy Bar aparece como módulo en preparación en el admin, aunque hay tablas y consultas SQL de reportes. Conviene distinguir lo implementado de lo preparado.

Archivos centrales: [inicio.component.ts](C:/Users/uld001/Desktop/Programacion-4-TP-N-1/src/app/pages/inicio/inicio.component.ts), [mis-peliculas.component.ts](C:/Users/uld001/Desktop/Programacion-4-TP-N-1/src/app/pages/mis-peliculas/mis-peliculas.component.ts), [experiencia-cliente.service.ts](C:/Users/uld001/Desktop/Programacion-4-TP-N-1/src/app/core/services/experiencia-cliente.service.ts).

## 9. Butacas y Realtime: dónde está y cómo se comunican

ButacasComponent conoce la función elegida y genera un UUID de token de compra. ButacasService consulta sala/asientos y pregunta a `butacas_ocupadas_funcion` cuáles están ocupadas. Esa RPC une **entradas de órdenes pagadas y reservas todavía activas**. La consulta de reservas permite distinguir reservas ajenas de la selección propia; al refrescar se evita pintar como ocupada la selección propia. Las reservas se guardan por combinación función/butaca, porque el mismo asiento físico puede venderse para distintas funciones.

`crear_sala_con_butacas` crea sala y mapa en una sola operación: 18 filas de 28 asientos más la fila J accesible de 14, total 518. No se crea la fila K. R, S y T son VIP (84 asientos); J es accesible; los otros 420 son normales. Una sala se crea con un formato y un idioma. En el mapa los pasillos son parte de la presentación, no asientos vendidos. VIP tiene recargo de 50% sobre el precio base; normal y accesible usan el precio base.

`reservarButaca` invoca `tomar_reserva_butaca`. Esa función elimina reservas vencidas, verifica que el asiento pertenezca a la sala, que no esté comprado y que no haya otra reserva activa. Guarda SHA-256 del token. Si la combinación función/asiento existe con una reserva todavía vigente, rechaza la nueva adquisición. Las reservas se retienen cinco minutos.

`canalReservas` está en [butacas.service.ts](C:/Users/uld001/Desktop/Programacion-4-TP-N-1/src/app/core/services/butacas.service.ts). Usa `postgres_changes`, tabla `public.reservas_butacas`, eventos `*` y filtro por función. La tabla está incluida en la publicación `supabase_realtime`, comprobado en el panel.

El aviso no reemplaza todas las consultas ni confirma una compra: llama al callback → ButacasComponent.actualizarReservas → vuelve a obtener reservas y butacas vendidas → actualiza signals → cambia el mapa. Cada 15 segundos se ejecuta la misma actualización para detectar vencimientos y servir de respaldo. Al comprar se borran las reservas, lo que provoca nuevos avisos y recarga del mapa de otros usuarios. [Funcionamiento de Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes).

Al salir, ngOnDestroy quita el canal, detiene el intervalo e intenta liberar reservas de la selección. Si esa liberación no llega, el vencimiento permite volver a adquirirlas. Al confirmar una compra, el servidor vuelve a comprobar token y vencimiento; una selección visual no garantiza que la reserva siga vigente.

**Límite para explicar:** la prueba de alertas no equivale a probar dos navegadores reservando a la vez. El código y la publicación Realtime están verificados; una demostración con dos clientes comprueba además la propagación del WebSocket. Una reserva propia vencida puede seguir seleccionada visualmente hasta que la RPC rechace la compra.

## 10. Asignación automática de salas y separación de treinta minutos

Recorrido: AdminFunciones.crear → obtenerPrecioEntradaBase → SalasFuncionesService.crearFuncion → RPC `crear_funcion_con_sala_automatica`.

La RPC comprueba rol admin, película existente, inicio futuro y precio positivo. Calcula `fin = inicio + duración`. Usa `pg_advisory_xact_lock` para serializar programación concurrente. Busca salas cuyo array `formatos` incluya el pedido y cuyo array `idiomas` incluya el idioma. Descarta las que tienen un horario incompatible y elige por número de sala. Usa `FOR UPDATE SKIP LOCKED`, inserta la función y devuelve el registro. Si no hay sala, devuelve un error; no se inventa otra sala ni se cambia el horario solicitado.

La regla de conflicto es:

```sql
f.fecha_hora_inicio < nuevo_fin + interval '30 minutes'
and f.fecha_hora_fin + interval '30 minutes' > nuevo_inicio
```

Comprueba ambos sentidos, porque la función nueva puede estar antes o después de otra. Si una termina a las 20:00, la siguiente puede comenzar a las 20:30; a las 20:29 se rechaza. No son treinta minutos entre horarios de inicio, ni entre salas diferentes.

También existe `validar_separacion_funciones`, ejecutado por el trigger `funciones_validar_separacion` **BEFORE INSERT OR UPDATE** de funciones. Reutiliza la comprobación incluso cuando la escritura no viene del botón de Angular. Excluye la misma fila al actualizar y usa el mismo bloqueo de programación.

La reutilización real de esta regla está en PostgreSQL: búsqueda de sala en la RPC y protección general en el trigger. Detalle de película y Butacas reutilizan SalasFuncionesService para leer las funciones; no vuelven a asignar salas.

Archivo del cliente: [salas-funciones.service.ts](C:/Users/uld001/Desktop/Programacion-4-TP-N-1/src/app/core/services/salas-funciones.service.ts).

## 11. Auditoría y reportes: tablas, librerías y descargas

### Cómo se registra la auditoría

`registrar_auditoria_fila` es una función trigger. Lee `TG_OP` y `TG_TABLE_NAME`, toma OLD si es DELETE y NEW en los demás casos, convierte la fila a JSON y guarda:

- usuario_id: auth.uid(), o null para una operación del sistema;
- accion: nombre de tabla + INSERT/UPDATE/DELETE;
- detalle: JSON de la fila, truncado a 2.000 caracteres;
- fecha_hora: now().

Los triggers comprobados cubren películas, salas, funciones, configuración, productos Candy, combos y la tabla histórica cupones. En esta revisión se agregan los de `configuracion_descuentos` y `cupones_descuento`, porque las promociones nuevas usan esas tablas. También se registran explícitamente acciones en cancelación, validación de QR y creación de personal.

No es un historial completo de antes/después para cada UPDATE: guarda la fila resultante. Tampoco captura automáticamente todas las consultas SELECT, cada clic o cada login. Esos son eventos diferentes.

Se encontró y corrigió una incompatibilidad: `log_actividad.usuario_id` no aceptaba null, pero el trigger podía ejecutarse sin auth.uid(), por ejemplo desde SQL Editor. Esa operación abortaba por el log. Ahora puede registrarse como Sistema, como ya contemplaba la interfaz.

`obtener_log_actividad_admin` comprueba rol admin, une el log con perfiles para mostrar correo, ordena más reciente primero y limita a 500. El período elegido para ventas **no filtra la auditoría**: esa RPC no recibe fechas.

### Reportes

AdminReportes calcula el rango del período elegido y cargar llama a ReportesService.obtenerReportes. Las opciones son Hoy (por día), últimos 7 días y últimos 30 días; inicialmente se muestran 30 días. El servicio ejecuta cuatro RPC en paralelo: ventas diarias, películas vendidas, productos vendidos y log de actividad. Si una falla, informa error y no aplica ese conjunto como una carga completa. El componente mantiene las señales y presentación; su HTML y CSS están en archivos separados. Se retiraron la tabla de pagos pendientes, su consulta y la confirmación manual del código Angular; las funciones históricas del servidor no se eliminaron.

| RPC | Qué calcula |
|---|---|
| obtener_reporte_ventas_diarias | Filtra órdenes PAGADA del período; suma total por día y cuenta entradas por separado, evitando multiplicar la facturación al unir una orden con varias entradas |
| obtener_reporte_peliculas_vendidas | Cuenta entradas pagadas por película; limita a veinte |
| obtener_reporte_candy_vendido | Suma cantidades de orden_candy, con nombre de producto o combo; limita a veinte |
| obtener_log_actividad_admin | Actividad reciente, hasta 500 registros |

Las consultas de ventas verifican rol admin en la condición SQL. Están basadas en fecha de compra, no fecha de proyección. Sus conversiones `fecha_compra::date` dependen de la zona horaria de la sesión PostgreSQL; mostrar una fecha argentina en el cliente no cambia automáticamente esa agrupación.

Las barras se dibujan con CSS y `[style.width.%]`: no hay Chart.js ni otra librería de gráficos. `maxPelicula/maxCandy` obtienen el máximo y `ancho` lo convierte en porcentaje.

### Qué descarga cada botón

| Acción | Implementación real |
|---|---|
| Exportar Excel (CSV) | Exporta solo ventas diarias. Construye texto con columnas Día, Facturación y Entradas, separador `;`, comillas escapadas, BOM UTF-8; crea Blob y un enlace de descarga; libera la URL temporal. Es `.csv`, no `.xlsx`; no usa una librería de Excel |
| Guardar PDF en reportes | `window.print()`: abre el diálogo de impresión; el usuario elige guardar como PDF. CSS `@media print` oculta controles. No usa jsPDF para ese reporte |
| Descargar ticket en PDF | jsPDF genera un PDF A5 con datos de compra y una imagen QR; `pdf.save` descarga el archivo |
| Generar QR del ticket | qrcode convierte el código emitido por PostgreSQL a un PNG Data URL; no lo valida ni asigna permisos |

Versiones declaradas: Angular 22.1, supabase-js 2.116, jsPDF 4.2, qrcode 1.5, Vitest 4. Revisar package-lock para la versión exacta instalada.

**Tres tipos de logs:** `log_actividad` es la auditoría de negocio que muestra la app; los logs de Edge Functions registran ejecución/errores del servidor; los logs de Auth/Postgres/Realtime del dashboard son diagnósticos de infraestructura. Un console.error del navegador no se escribe automáticamente en log_actividad.

Archivo: [admin-reportes.component.ts](C:/Users/uld001/Desktop/Programacion-4-TP-N-1/src/app/pages/admin/reportes/admin-reportes.component.ts).

## 12. Subida de imágenes desde PC

FormularioPelicula mantiene el campo URL y agrega el selector de archivo. `subirImagen` toma File → ImagenesService.subirPoster → Supabase Storage → URL pública → formulario.imagenUrl. Al guardar la película, PeliculasService persiste esa URL en imagen_url. No se guardan los bytes de la imagen dentro de la fila de películas.

El servicio exige administrador, JPG/PNG/WebP y archivo no vacío de hasta 5 MB. Utiliza un nombre UUID y `upsert:false` para no sobrescribir un póster existente. Storage también controla tamaño/tipos; la política de insert exige administrador. El bucket público permite ver los pósters de la cartelera sin login. [Control de acceso de Storage](https://supabase.com/docs/guides/storage/security/access-control).

Mientras se sube, se bloquea guardar la película. Si falla, muestra un error y conserva la URL anterior. Si el administrador sube una imagen y luego cancela el formulario, el archivo puede quedar sin una película asociada: no se implementó limpieza automática de archivos sobrantes.

Archivos: [imagenes.service.ts](C:/Users/uld001/Desktop/Programacion-4-TP-N-1/src/app/core/services/imagenes.service.ts), [imagenes-y-auditoria-descuentos.sql](C:/Users/uld001/Desktop/Programacion-4-TP-N-1/supabase/sql/imagenes-y-auditoria-descuentos.sql).

## 13. Primera compra y cupones para mayores de cincuenta

La consigna pide **edad**, no comprobar jubilación. La elegibilidad se basa en fecha_nacimiento del perfil. El control actual compara años cumplidos `> 50`: se admite a partir de 51 años; con 50 no pasa. No se usa la fecha que el cliente podría enviar en el formulario de compra para obtener ese cupón.

AdminConfiguracion contiene AdminCupones. CuponesService permite:

- obtener/guardar porcentaje de primera compra en la fila única de configuracion_descuentos;
- listar cupones_descuento;
- crear un código o editarlo por ID, incluyendo porcentaje, solo_mayores_50 y activo;
- validar código de 3 a 30 caracteres, porcentaje y hasta dos decimales.

Primera compra acepta de 0 a 100; cero desactiva el beneficio. Los códigos manuales exigen porcentaje mayor a cero. `PRIMERA_COMPRA` es un identificador reservado. Las políticas permiten modificar configuración/cupones solo a administración; la lectura pública de configuración sirve para presentar el porcentaje vigente en Inicio.

Al comprar, la RPC bloquea el perfil y comprueba que primera_compra_usada sea false y que no exista otra orden pagada. Lee el porcentaje vigente. Si se ingresó un cupón, exige sesión, existencia, estado activo y edad si corresponde. Elige un solo descuento: el mayor; en un empate conserva primera compra. Un código inválido/inactivo/no elegible produce error, no se ignora silenciosamente.

El porcentaje se aplica a cada entrada y se redondea a dos decimales. Luego se suma el total y se guardan subtotal, descuento, código y porcentaje en la orden. Ticket muestra el porcentaje real, sin texto fijo 20%. Cambiar la configuración afecta compras futuras, no recalcula órdenes anteriores.

Una primera compra confirmada consume el beneficio aunque el cupón manual haya sido mayor o el porcentaje global estuviera en cero. Cancelar no vuelve a habilitarlo. Los cupones manuales actuales no tienen límite de usos ni fecha de vencimiento; se pueden desactivar desde configuración.

Archivos: [cupones.service.ts](C:/Users/uld001/Desktop/Programacion-4-TP-N-1/src/app/core/services/cupones.service.ts), [admin-cupones.component.ts](C:/Users/uld001/Desktop/Programacion-4-TP-N-1/src/app/pages/admin/configuracion/admin-cupones.component.ts), [cupones-configurables.sql](C:/Users/uld001/Desktop/Programacion-4-TP-N-1/supabase/sql/cupones-configurables.sql).

## 14. Alertas: flujo exacto, pruebas y límites

1. Inicio muestra estrenos y permite activar una alerta. Si no hay sesión, navega al login.
2. ExperienciaClienteService.activarAlerta hace upsert en alertas_estreno con usuario_id, pelicula_id y notificada=false. La combinación usuario/película evita duplicados.
3. Al cargar Inicio, obtenerAlertasActivas consulta las suscripciones del usuario y marca sus botones. A pesar del nombre, ese método no filtra por notificada=false.
4. MisPeliculas llama a obtener_mis_alertas_estreno. La RPC filtra por auth.uid() y calcula disponible si la película está EN_CARTELERA **o** existe una función futura.
5. Mis películas muestra un mensaje distinto según disponible. No hay un correo, push, tarea programada o trigger que envíe avisos; no hay actualización automática de notificada a true en este recorrido.

**Consecuencia:** una película EN_CARTELERA puede aparecer como disponible aun sin funciones, y una PROXIMAMENTE puede aparecer disponible si tiene una función futura, aunque su preventa todavía esté desactivada. La alerta informa el estado calculado; la compra sigue teniendo controles propios.

Pruebas del servidor ejecutadas dentro de BEGIN/ROLLBACK:

- Dos altas de la misma suscripción dejan una alerta.
- Próximamente sin funciones devuelve disponible=false.
- Cambiar a cartelera devuelve true.
- Agregar función futura también devuelve true.
- Cambiar identidad no devuelve esa alerta ajena.

Todas pasaron después de corregir el actor nulo en auditoría. El rollback revierte las filas temporales y sus logs. Esa prueba verifica la RPC y su filtro de identidad; no es una prueba completa de todas las políticas RLS con distintos roles de conexión.

También se agregaron pruebas unitarias para el servicio y el componente Inicio: invitado, guardado, error, consulta por cuenta, mapeo y estado visual. Consultar los resultados concretos de la última ejecución en [verificacion-profesor.md](C:/Users/uld001/Desktop/Programacion-4-TP-N-1/docs/verificacion-profesor.md).

Script repetible: [alertas-estreno.sql](C:/Users/uld001/Desktop/Programacion-4-TP-N-1/supabase/tests/alertas-estreno.sql).

## 15. Inventario breve de servicios y funciones públicas

| Servicio | Funciones públicas |
|---|---|
| AuthService | whenReady, refreshCurrentProfile, client, login, register, logout; signals de sesión/perfil/rol/loading |
| PerfilService | cargar(client, user), limpiar; señal currentProfile |
| SesionService | configurar, iniciar, recuperar, verificar, cerrar, limpiar; reloj y marca local del inicio |
| PeliculasService | obtenerTodas, obtenerCartelera, obtenerProximamente, obtenerPorId, crear, actualizar, eliminar |
| PeliculasCrudService | cargarPeliculas, guardar, eliminar, iniciarEdicion, limpiarEdicion; estado compartido del admin |
| ReseniasService | obtenerResumenes, obtenerPorPelicula, guardar |
| SalasFuncionesService | listarSalas, crearSala, eliminarSala, obtenerPrecioEntradaBase, actualizarPrecioEntradaBase, crearFuncion, eliminarFuncion, listarFunciones |
| ButacasService | obtenerButacas, obtenerReservasActivas, reservarButaca, liberarReservas, canalReservas |
| ComprasService | crearOrden; transforma la respuesta SQL a ComprobanteCompra |
| ExperienciaClienteService | obtenerMasVendidas, activarAlerta, obtenerAlertasActivas, obtenerMisAlertasEstreno, obtenerMisComprobantes, obtenerMisPeliculas, cancelarMiOrden |
| CuponesService | obtenerPorcentajePrimeraCompra, guardarPorcentajePrimeraCompra, listar, guardar |
| ImagenesService | subirPoster |
| ReportesService | obtenerReportes, exportarVentasCsv; lo usa AdminReportesComponent |

`obtenerMisComprobantes` existe en ExperienciaClienteService, pero MisPeliculas usa el historial que ya incluye QR. No inventar un consumidor de un método por el hecho de que exista.

## 16. Componentes: cómo se comunican y por qué se separaron

Los componentes de página administran carga, selección y errores; los componentes pequeños presentan una parte reutilizable. La comunicación padre → hijo usa inputs; hijo → padre usa outputs. Los servicios compartidos conservan estado cuando varias vistas de administración lo necesitan.

- AuthComponent alterna Login/Registro. Pasa isLoading a cada hijo; los hijos emiten loginSubmit/registerSubmit. Auth procesa el resultado y navega a Admin para administradores o Inicio para los demás.
- Inicio pasa pelicula y resumenResenias a TarjetaPelicula. La tarjeta no vuelve a pedir esos datos.
- Detalle pasa peliculaId a ReseniasPelicula; las reseñas tienen su propia carga y mensajes.
- AdminComponent selecciona seccionActiva con @switch; sus módulos no son rutas hijas independientes.
- AdminPeliculas mantiene la pestaña crear/listar; Formulario emite guardadoExitoso y Listado avisa cuando solicita editar. Ambos usan PeliculasCrudService; el padre coordina qué vista mostrar.
- SelectorFecha implementa CVA para integrarse con ambas familias de formularios, sin obligar a cada página a duplicar segmentos y conversión.
- AdminCupones se separa de AdminConfiguracion para que la gestión de promociones no mezcle su formulario/estado con el precio base de entradas.

No toda la lógica está completamente aislada en servicios: AdminUsuarios y ValidarQr todavía llaman directamente al cliente compartido. AdminReportes delega sus consultas en ReportesService. Esa es la arquitectura real a explicar, y una posible división futura si crecen esos módulos.

## 17. Respuesta corta para el profesor

La interfaz está organizada en componentes standalone. Los componentes reciben acciones, validan formularios y muestran estado con signals. Los servicios agrupan el acceso a datos y comparten un cliente Supabase creado en AuthService. Los formularios de registro son reactivos y los formularios simples usan NgModel. La directiva soloAdmin controla una vista; los guards controlan rutas; PostgreSQL controla los permisos y reglas definitivas. La programación usa una RPC que elige sala compatible y un trigger que protege la separación de treinta minutos. Butacas usa reservas temporales, Realtime y una validación transaccional al comprar. Puntos y descuentos se calculan en el servidor. Auditoría registra cambios de negocio; los reportes consultan agregados y descargan CSV o usan impresión, mientras el ticket genera PDF con jsPDF y QR con qrcode.
