# Funcionalidades Angular del proyecto

> Documento vivo del proyecto Cine. Actualizar esta guia cada vez que se agregue un componente, servicio, ruta o funcionalidad relevante.

## 1. Resumen de la arquitectura

El proyecto utiliza Angular 22 con componentes **standalone**, sin `NgModule` principal. La aplicacion se inicia mediante `bootstrapApplication`, configura sus proveedores en `app.config.ts` y muestra las vistas mediante Angular Router.

La estructura funcional actual es:

- **Shell principal:** `App`, navbar, contenido de ruta y footer.
- **Inicio:** `InicioComponent`, pagina principal del cine.
- **Administracion:** `AdminComponent`, pagina inicial disponible solo para usuarios con rol `admin`.
- **Directivas:** directivas propias reutilizables para encapsular reglas de visualizacion.
- **Autenticacion:** `AuthComponent`, contenedor de login y registro.
- **Formularios:** `ComponenteLogin` y `ComponenteRegistro`.
- **Estado y acceso a datos:** `AuthService`, Signals y Supabase.
- **Contratos de datos:** interfaces y tipos de `user.model.ts`.

## 2. Arranque y configuracion global

### `src/main.ts`

- Usa `bootstrapApplication(App, appConfig)` para iniciar Angular con un componente standalone.
- Captura errores de arranque con `.catch()` y `console.error()`.

### `src/app/app.config.ts`

- Usa `ApplicationConfig` para definir la configuracion global.
- Registra `provideRouter(routes)` para habilitar la navegacion.
- Registra `provideBrowserGlobalErrorListeners()` para los listeners globales de errores del navegador.

### `src/app/app.routes.ts`

- Define las rutas con el tipo `Routes`.
- Ruta `/`: renderiza `InicioComponent` para usuarios comunes y utiliza `homeGuard` para redirigir administradores a `/admin`.
- Ruta `/login`: renderiza `AuthComponent`.
- Ruta `/admin`: renderiza `AdminComponent` y utiliza `adminGuard`.
- Ruta comodin `**`: redirige cualquier ruta desconocida a `/`.

## 3. Componentes

### `src/app/app.ts` - Componente raiz `App`

Responsabilidades:

- Es el punto de entrada de la aplicacion.
- Importa `AppLayoutComponent` y lo renderiza mediante el selector `<app-layout />`.
- No contiene navbar, footer, rutas ni logica de autenticacion.

Esta separacion permite que el componente raiz cumpla una sola responsabilidad: iniciar la estructura principal de la aplicacion.

### `src/app/layout/` - Layout principal

El layout concentra la estructura visual comun a todas las paginas:

- `app-layout.component.ts`: contiene la logica de sesion y logout.
- `app-layout.component.html`: contiene navbar, navegacion, `router-outlet` y footer.
- `app-layout.component.css`: contiene los estilos exclusivos del shell.

Responsabilidades de `AppLayoutComponent`:

- Muestra el enlace a Inicio y el acceso a login.
- Muestra el nombre del usuario cuando existe una sesion.
- Ejecuta `AuthService.logout()` y vuelve a `/` al cerrar sesion.
- Define el lugar donde Angular inserta las vistas de las rutas.

APIs y utilidades Angular usadas:

- `@Component` standalone.
- `inject(AuthService)` y `inject(Router)`.
- `RouterOutlet` para renderizar la vista de la ruta activa.
- `RouterLink` para enlaces internos sin recargar la pagina.
- `RouterLinkActive` para marcar el enlace de la ruta activa.
- El enlace `Inicio` se oculta cuando la ruta actual ya es `/` y vuelve a mostrarse en `/login`.
- El enlace `Inicio` no se renderiza para administradores.
- El enlace `Iniciar Sesion` se oculta cuando la ruta actual ya es `/login`.
- `@if` para alternar los controles segun el estado de autenticacion.
- Interpolacion `{{ }}` para mostrar el nombre del perfil.
- Event binding `(click)` para cerrar sesion.
- Property binding `[routerLinkActiveOptions]` para exigir coincidencia exacta en Inicio.

### `src/app/pages/inicio/inicio.component.ts` - `InicioComponent`

- Representa la pagina de inicio.
- Actualmente es un componente visual sin logica propia.
- Muestra un banner de bienvenida, peliculas destacadas y una seccion de proximos estrenos.

APIs Angular usadas:

- `@Component` standalone.
- `templateUrl` y `styleUrl` para separar HTML y CSS.

### `src/app/pages/admin/admin.component.ts` - `AdminComponent`

- Representa el apartado inicial del administrador.
- Muestra un saludo con el nombre del perfil autenticado.
- Utiliza `AuthService.currentProfile()` para obtener el nombre.
- Es standalone y separa su template y estilos en archivos propios.

### `src/app/guards/admin.guard.ts` - `adminGuard`

- Es un guard funcional (`CanActivateFn`).
- Espera a que `AuthService` termine de recuperar la sesion.
- Permite `/admin` solamente cuando `AuthService.isAdmin()` es verdadero.
- Redirige a `/` a usuarios no autenticados o con otro rol.

### `src/app/guards/home.guard.ts` - `homeGuard`

- Espera la inicializacion de autenticacion antes de resolver la ruta `/`.
- Permite que usuarios comunes vean `InicioComponent`.
- Redirige automaticamente a `/admin` cuando el usuario tiene rol `admin`.

### `src/app/directivas/solo-admin.directive.ts` - `SoloAdminDirective`

- Es una directiva estructural standalone que se utiliza como `*soloAdmin`.
- Muestra el elemento asociado solamente cuando `AuthService.isAdmin()` es verdadero.
- Reacciona a los cambios del Signal del rol mediante `effect()`.
- Centraliza la regla de visibilidad del enlace de administración para mantener limpio el template del layout.

Las directivas integradas de Angular, como `@if`, `@for`, `RouterLink`, `RouterLinkActive` y `RouterOutlet`, permanecen en los componentes que las utilizan. No forman parte de la carpeta propia porque pertenecen al framework.

### `src/app/auth/auth.component.ts` - `AuthComponent`

Responsabilidades:

- Contiene el flujo de autenticacion.
- Alterna entre las pestañas `login` y `register` mediante `cambiarTab()`.
- Limpia los mensajes de error y exito al cambiar de formulario.
- Recibe las credenciales del formulario de login y llama a `AuthService.login()`.
- Recibe las credenciales del formulario de registro y llama a `AuthService.register()`.
- Muestra mensajes de error cuando una operacion falla.
- Redirige al administrador a `/admin` despues del login.
- Redirige a usuarios comunes y nuevos registros a `/`.
- Expone `authService.isLoading()` a los formularios para bloquearlos durante una operacion.

APIs Angular usadas:

- `@Component` standalone.
- `inject(AuthService)` y `inject(Router)`.
- `input` y `output` de los componentes hijos a traves de sus bindings en la plantilla.
- `@if` para renderizar mensajes y el formulario seleccionado.
- Event binding `(click)` para cambiar de pestaña.
- Event binding `(loginSubmit)` y `(registerSubmit)` para escuchar eventos personalizados.
- Property binding `[isLoading]` para enviar el estado de carga a los hijos.
- `Router.navigate(['/'])` para la redireccion posterior a autenticarse.

### `src/app/componentes/componente-login/componente-login.ts`

Responsabilidades:

- Gestiona los campos locales `email` y `password`.
- Maneja el submit del formulario con `onSubmit()`.
- Evita el comportamiento tradicional del navegador con `event.preventDefault()`.
- Valida que email y contraseña no esten vacios.
- Emite las credenciales con `loginSubmit` hacia `AuthComponent`.
- Recibe `isLoading` desde el componente padre.

APIs Angular usadas:

- `@Component` standalone.
- `FormsModule` para trabajar con formularios basados en plantillas.
- `input<boolean>(false)` para un input reactivo tipado.
- `output<LoginCredentials>()` para un evento personalizado tipado.
- `[(ngModel)]` para two-way binding entre inputs y propiedades TypeScript.
- `(submit)` para manejar el envio del formulario.
- `[disabled]` para deshabilitar campos y boton mientras carga.
- `@if` para cambiar el texto del boton entre `Ingresando...` e `Ingresar`.

### `src/app/componentes/componente-registro/componente-registro.ts`

Responsabilidades:

- Gestiona los datos del nuevo usuario: nombre, apellido, email, password, fecha de nacimiento, tipo de sangre, color de ojos y dias de vacaciones.
- Mantiene la lista de tipos de sangre disponibles.
- Mantiene una lista cerrada de colores de ojos basicos para evitar valores arbitrarios.
- Maneja el submit con `onSubmit()`.
- Evita el envio tradicional del navegador.
- Valida que los campos obligatorios esten completos.
- Valida que los dias de vacaciones existan y no sean negativos.
- Convierte los dias de vacaciones a `number`.
- Emite los datos mediante `registerSubmit` hacia `AuthComponent`.
- Recibe `isLoading` desde el componente padre.

APIs Angular usadas:

- `@Component` standalone.
- `FormsModule`.
- `input<boolean>(false)`.
- `output<RegisterCredentials>()`.
- `[(ngModel)]` y bindings `[disabled]`.
- `@for (tipo of tiposDeSangre; track tipo)` para generar las opciones del `<select>`.
- `@for (color of coloresDeOjos; track color)` para generar las opciones del color de ojos.
- `@if` para mostrar el estado del boton.

## 4. Plantillas y sintaxis Angular utilizada

### Interpolacion

Se usa `{{ expresion }}` para insertar valores en HTML, por ejemplo el nombre del perfil o el texto de una opcion.

### Property binding

Se usa `[propiedad]="expresion"` para enviar valores desde TypeScript al HTML:

- `[disabled]="isLoading()"`.
- `[value]="tipo"`.
- `[class.active]="tab === 'login'"`.
- `[routerLinkActiveOptions]="{ exact: true }"`.

### Event binding

Se usa `(evento)="expresion"` para responder a eventos:

- `(submit)="onSubmit($event)"`.
- `(click)="cambiarTab('login')"`.
- `(loginSubmit)="handleLogin($event)"`.

### Two-way binding

`[(ngModel)]` sincroniza el valor de los inputs con las propiedades del componente.

### Control flow moderno

- `@if`: renderizado condicional de mensajes, formularios, botones y estado de autenticacion.
- `@for`: renderizado repetido de los tipos de sangre.
- `track tipo`: identifica cada opcion del listado para optimizar la actualizacion del DOM.

### Directivas Router

- `routerLink`: navega entre rutas internas.
- `routerLinkActive`: agrega una clase cuando el enlace coincide con la URL activa.
- `router-outlet`: punto donde Angular inserta el componente asociado a la ruta.

## 5. Servicio de autenticacion

### `src/app/services/auth.ts` - `AuthService`

Es un servicio singleton disponible en toda la aplicacion mediante `providedIn: 'root'`.

#### Estado reactivo

- `currentUser`: usuario autenticado de Supabase o `null`.
- `currentProfile`: perfil de la tabla `profiles` o `null`.
- `isLoading`: indica si login, registro o logout estan en progreso.
- `isLoggedIn`: computed que indica si existe usuario autenticado.
- `userRole`: computed con el rol actual.
- `isAdmin`, `isEmpleado`, `isCliente`: computed para consultar rapidamente el rol.
- `whenReady()`: permite que los guards esperen la recuperacion inicial de sesion y perfil.

#### Inicializacion de sesion

- Crea el cliente de Supabase con las variables de `environment`.
- Consulta la sesion existente con `getSession()`.
- Recupera el perfil si ya existe una sesion.
- Escucha cambios futuros con `onAuthStateChange()`.
- Limpia el perfil cuando se cierra la sesion.

#### Perfil de usuario

`loadUserProfile()`:

- Busca el perfil en la tabla `profiles` por `id`.
- Mapea nombres de columnas de base de datos a propiedades TypeScript.
- Usa datos de `user_metadata` como respaldo cuando no hay datos en la tabla.
- Define valores iniciales para credito, puntos y primera compra.

#### Login

`login(credentials)`:

- Activa `isLoading`.
- Ejecuta `signInWithPassword()`.
- Guarda el usuario autenticado.
- Carga su perfil.
- Devuelve `{ success: true }` o `{ success: false, error }`.
- Desactiva `isLoading` en `finally`.

#### Registro

`register(credentials)`:

- Activa `isLoading`.
- Ejecuta `signUp()` con los datos personales como metadata.
- Asigna el rol inicial `cliente`.
- Inserta o actualiza el perfil mediante `upsert()` en `profiles`.
- Carga el perfil creado.
- Devuelve un resultado de exito o error.
- Desactiva `isLoading` en `finally`.

#### Logout

`logout()`:

- Ejecuta `signOut()` en Supabase.
- Limpia `currentUser` y `currentProfile`.
- Devuelve un resultado de exito o error.
- Mantiene el estado de carga correctamente.

APIs Angular usadas en el servicio:

- `@Injectable({ providedIn: 'root' })`.
- `signal()` para estado mutable reactivo.
- `computed()` para valores derivados.
- Lectura de Signals mediante `signal()` y actualizacion mediante `.set()`.

## 6. Modelos y tipos

### `src/app/models/user.model.ts`

- `UserRole`: limita los roles a `cliente`, `empleado` o `admin`.
- `TipoSangre`: limita los tipos de sangre conocidos.
- `UserProfile`: describe el perfil completo del usuario.
- `LoginCredentials`: contrato del formulario de login.
- `RegisterCredentials`: contrato del formulario de registro.

Estos tipos permiten validar los datos que viajan entre formularios, componente de autenticacion y servicio.

## 7. Integracion externa

### Supabase

La autenticacion y los perfiles se gestionan con `@supabase/supabase-js`:

- `createClient()` crea el cliente.
- `auth.signInWithPassword()` inicia sesion.
- `auth.signUp()` registra usuarios.
- `auth.signOut()` cierra sesion.
- `auth.getSession()` recupera la sesion existente.
- `auth.onAuthStateChange()` reacciona a cambios de autenticacion.
- `from('profiles')` accede a la tabla de perfiles.
- `select()`, `eq()`, `maybeSingle()` y `upsert()` consultan y guardan datos.

## 8. Pruebas actuales

- `src/app/app.spec.ts`: pruebas del componente raiz. Actualmente necesita proveedores del Router para renderizar `RouterLink` y contiene una expectativa de titulo que no coincide con la plantilla actual.
- `src/app/componentes/componente-login/componente-login.spec.ts`: verifica que el componente de login se cree correctamente.
- `src/app/services/auth.spec.ts`: archivo detectado, pero actualmente no contiene una suite de pruebas.

## 9. Dependencias Angular relevantes

Definidas en `package.json`:

- `@angular/core`: componentes, inyeccion, Signals y configuracion base.
- `@angular/router`: rutas, navegacion y directivas de Router.
- `@angular/forms`: `FormsModule` y `ngModel`.
- `@angular/platform-browser`: arranque de la aplicacion.
- `@angular/common`: funcionalidades comunes de Angular.
- `@angular/compiler`: compilacion de templates.
- `rxjs`: dependencia reactiva disponible en el proyecto.

## 10. Estilos globales

- La tipografia principal de prueba de toda la aplicacion es `Segoe UI Black`.
- Se utiliza como fuente del sistema desde `src/styles.css`.
- La variable CSS `--font-primary` centraliza la familia tipografica.
- Los elementos generales y los controles de formulario usan la misma fuente.
- Se conserva `sans-serif` como respaldo si la fuente externa no esta disponible.

## 11. Recorrido completo de la aplicacion

### 11.1 Inicio de la aplicacion

El recorrido comienza en `src/main.ts`:

```text
main.ts
	-> bootstrapApplication(App, appConfig)
	-> App
	-> AppLayoutComponent
	-> router-outlet
```

1. `bootstrapApplication()` inicia Angular sin `NgModule`.
2. `appConfig` registra el Router y sus rutas.
3. `App` es el componente raiz y solo llama a `<app-layout />`.
4. `AppLayoutComponent` muestra la estructura comun: navbar, contenido y footer.
5. `router-outlet` queda esperando el componente correspondiente a la URL actual.

El layout no decide por si solo que pagina debe mostrarse. Esa decision la toma el Router usando `app.routes.ts`.

### 11.2 Que contiene el layout

`AppLayoutComponent` permanece visible en todas las rutas. Dentro de el:

- La marca `WildeCinemas` navega a `/`.
- El enlace `Inicio` se muestra para usuarios comunes.
- El enlace `Administracion` usa `*soloAdmin` y solo se muestra a administradores.
- Si no hay sesion, aparece `Iniciar Sesion` y navega a `/login`.
- Si hay sesion, aparece el nombre del perfil y `Cerrar Sesion`.
- `router-outlet` inserta la pagina activa.

El layout es una carcasa comun. `InicioComponent`, `AuthComponent` y `AdminComponent` aparecen dentro del `router-outlet`, no reemplazan al layout completo.

### 11.3 Usuario no autenticado

Al entrar por primera vez:

```text
URL /
	-> homeGuard espera a AuthService.whenReady()
	-> no hay usuario admin
	-> InicioComponent se carga en router-outlet
	-> layout muestra "Iniciar Sesion"
```

Si se entra a `/login`:

```text
URL /login
	-> AuthComponent se carga en router-outlet
	-> tab inicia en "login"
	-> layout mantiene el navbar
	-> el boton "Iniciar Sesion" se oculta porque ya esta en /login
	-> el enlace "Inicio" queda disponible
```

### 11.4 Donde estan login y registro

Ambos viven dentro de `AuthComponent`, no son rutas separadas actualmente.

```text
AuthComponent
	├── tab = 'login'
	│     └── ComponenteLogin
	└── tab = 'register'
				└── ComponenteRegistro
```

`AuthComponent` decide cual formulario mostrar mediante `@if`:

- Si `tab === 'login'`, renderiza `<app-componente-login>`.
- Si `tab === 'register'`, renderiza `<app-componente-registro>`.
- Los botones de pestaña llaman a `cambiarTab()`.
- `cambiarTab()` cambia la pestaña y limpia mensajes anteriores.

### 11.5 Flujo de login

```text
Usuario completa email y password
	-> ComponenteLogin.onSubmit()
	-> valida que no esten vacios
	-> emite loginSubmit
	-> AuthComponent.handleLogin()
	-> AuthService.login()
	-> Supabase signInWithPassword()
```

Si falla:

```text
Supabase devuelve error
	-> AuthService devuelve success: false
	-> AuthComponent guarda errorMessage
	-> AuthComponent permanece en /login
```

Si funciona:

```text
Supabase devuelve usuario
	-> AuthService actualiza currentUser
	-> carga currentProfile desde profiles
	-> AuthComponent consulta isAdmin()
```

- Rol `admin`: navega a `/admin`.
- Otro rol: navega a `/`.

### 11.6 Flujo de registro

```text
Usuario completa el formulario
	-> ComponenteRegistro.onSubmit()
	-> valida campos y dias de vacaciones
	-> emite registerSubmit
	-> AuthComponent.handleRegister()
	-> AuthService.register()
	-> Supabase signUp()
	-> upsert en profiles
	-> carga el perfil
	-> navega a /
```

El registro asigna siempre el rol inicial `cliente`. Por eso un usuario recién registrado no entra al panel de administración.

Si hay un error de autenticación, el formulario permanece en `/login` y se muestra `errorMessage`.

### 11.7 Usuario administrador

Después de iniciar sesión con rol `admin`:

```text
login exitoso
	-> AuthComponent navega a /admin
	-> adminGuard espera la sesion
	-> isAdmin() devuelve true
	-> AdminComponent se carga en router-outlet
```

En `/admin`:

- Se muestra el panel básico.
- `AdminComponent` obtiene el perfil mediante `AuthService`.
- Se muestra `Hola, nombre`.
- `*soloAdmin` muestra el enlace `Administracion`.
- El enlace `Inicio` no se renderiza para administradores.

Si el administrador intenta entrar a `/`:

```text
URL /
	-> homeGuard detecta isAdmin() === true
	-> devuelve UrlTree hacia /admin
	-> se carga AdminComponent
```

### 11.8 Usuario no administrador intentando `/admin`

```text
URL /admin
	-> adminGuard espera a AuthService.whenReady()
	-> isAdmin() devuelve false
	-> devuelve UrlTree hacia /
	-> homeGuard permite InicioComponent
```

Esto evita que un usuario común o no autenticado acceda al panel escribiendo la URL manualmente.

### 11.9 Cierre de sesion

```text
Usuario pulsa "Cerrar Sesion"
	-> AppLayoutComponent.cerrarSesion()
	-> AuthService.logout()
	-> Supabase signOut()
	-> currentUser = null
	-> currentProfile = null
	-> Router navega a /
	-> homeGuard permite InicioComponent
```

Después del logout, el layout deja de mostrar el saludo y el botón de logout, y vuelve a mostrar `Iniciar Sesion`.

### 11.10 Tabla de rutas actuales

| URL | Componente | Protección | Resultado |
|---|---|---|---|
| `/` | `InicioComponent` | `homeGuard` | Usuarios comunes ven Inicio; admins van a `/admin`. |
| `/login` | `AuthComponent` | Ninguna | Contiene las pestañas Login y Registro. |
| `/admin` | `AdminComponent` | `adminGuard` | Solo se permite al rol `admin`. |
| Cualquier otra | Redireccion a `/` | `homeGuard` | Se intenta llevar al destino inicial correspondiente al rol. |

### 11.11 Resumen de responsabilidades

```text
main.ts                 Arranca Angular
app.config.ts           Registra proveedores globales y Router
app.routes.ts           Decide que componente corresponde a cada URL
App                     Llama al layout
AppLayoutComponent      Navbar, footer, logout y router-outlet
AuthComponent           Coordina pestañas, login, registro y redirecciones
ComponenteLogin         Captura y valida credenciales de login
ComponenteRegistro      Captura y valida datos de registro
AuthService             Habla con Supabase y conserva el estado de sesion
adminGuard              Protege la ruta /admin
homeGuard               Redirige admins desde /
SoloAdminDirective      Oculta o muestra el enlace de administracion
AdminComponent          Muestra el panel basico del administrador
InicioComponent         Muestra la pagina publica del cine
user.model.ts           Define los contratos y roles de los datos
```

## 12. Checklist para actualizar este documento

Al agregar una funcionalidad, revisar si corresponde documentar:

- [ ] Nuevo componente: responsabilidad, inputs, outputs, bindings y control flow.
- [ ] Nueva ruta: path, componente y redirecciones.
- [ ] Nuevo servicio: inyeccion, estado y metodos publicos.
- [ ] Nuevo modelo: interfaces, tipos y flujo de datos.
- [ ] Nueva directiva o pipe.
- [ ] Nuevo proveedor en `app.config.ts`.
- [ ] Nueva integracion externa o llamada a Supabase.
- [ ] Nueva prueba o cambio en la estrategia de testing.
- [ ] Cambio en el flujo de autenticacion o permisos.

## Historial de actualizaciones

| Fecha | Cambio |
|---|---|
| 2026-09-16 | Creacion del documento con el inventario inicial del proyecto. |
| 2026-09-16 | Se extrajo el layout principal a `src/app/layout/`; `App` quedo reducido al selector `<app-layout />`. |
| 2026-09-16 | Se agrego `/admin`, el guard por rol `admin` y el saludo inicial del administrador. |
| 2026-09-16 | Se agrego el recorrido completo de arranque, rutas, autenticacion, roles, guards, layout y directivas. |
| 2026-09-16 | Se agrego `homeGuard` y la redireccion automatica de administradores a `/admin`. |
