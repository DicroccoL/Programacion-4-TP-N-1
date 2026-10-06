# Verificación de la división de AuthService

Fecha: 6 de octubre de 2026.

## Resultado de las pruebas

`npm test -- --watch=false`: **65 pruebas aprobadas en 8 archivos**, salida 0, incluyendo la redirección automática al vencer.
Se ejecutó toda la batería de pruebas presente en el proyecto.

La compilación final `npx ng build --configuration development` también terminó correctamente, salida 0.

Las nuevas pruebas utilizan los tres servicios reales de Angular y simulan las respuestas del SDK de Supabase. No crean usuarios ni compras en la base de datos.

### Autenticación e integración

- Cliente Supabase compartido y señal de perfil compartida.
- Login correcto, correo sin espacios exteriores y contraseña conservada.
- Login rechazado y excepciones de conexión.
- Registro con metadata de cliente y sesión inmediata.
- Registro sin sesión mientras se espera confirmación de correo.
- Errores de registro y correo duplicado.
- Logout correcto y fallos al cerrar sesión.
- Recuperación de sesión y rol al reiniciar el servicio, simulando una actualización.
- Cierre de sesiones recuperadas vencidas o sin marca de inicio.
- Renovación de token sin extender los siete minutos.
- Eventos SIGNED_IN y SIGNED_OUT.
- Recarga de puntos y saldo; no consultar perfil sin usuario.
- Estado de carga mientras una operación está pendiente.
- Guards y plantilla real del menú con admin, empleado, cliente y visitante.

### Duración de sesión

- Cierre exactamente a los siete minutos mediante reloj simulado.
- Recuperación con solo el tiempo restante.
- Marca ausente, dañada, de otro usuario o vencida.
- Regreso a la pestaña y comprobación desde whenReady cuando el timer no corrió.
- Cancelación del temporizador al cerrar sesión.
- Evitar cierres simultáneos y limpiar después de un error.

### Perfil

- Consulta por UUID y transformación de campos y números.
- Respaldo de metadata cuando no se obtiene la fila.
- Limpieza y errores de conexión.
- Respuesta tardía después del logout.
- Respuesta antigua que termina después de una consulta más reciente.

## Fallo encontrado y corregido

Una consulta pendiente podía volver a colocar el perfil después del logout. La prueba reprodujo el fallo antes de corregirlo. PerfilService ahora identifica las consultas con una versión; limpiar el perfil o iniciar una consulta nueva invalida las respuestas anteriores.

## Navegación comprobada en navegador local

Con un visitante sin sesión, en `http://127.0.0.1:4201`:

| Ruta solicitada | Resultado observado |
|---|---|
| /mis-peliculas | /login?redirect=%2Fmis-peliculas |
| /validar-qr | /login |
| /admin | Inicio / |

El menú del visitante no mostró Mis películas, Validar QR ni Panel de Control. No se observaron errores o advertencias en la consulta de consola realizada durante estas navegaciones.

### Cuenta real de administrador

El usuario inició sesión personalmente en el navegador de prueba. Se observó el panel administrativo, el nombre del perfil y los enlaces correspondientes al rol. Al actualizar se recuperó la sesión y el perfil. Desde el menú se accedió a Validar QR y Mis películas; esta última mostró los puntos y saldo del perfil.

A pedido del usuario se redujo temporalmente el plazo a 30 segundos. Con un nuevo login real se observó la desaparición del usuario, el botón Salir y los enlaces privados al vencer. Al intentar entrar a /validar-qr nuevamente, el guard redirigió al login. Después se restauró la constante a **7 * 60 * 1000**.

**Corrección posterior solicitada:** el vencimiento ahora limpia usuario/perfil y llama a `Router.navigate(['/'])` desde `AuthService.cerrarSesionLocal`. Así abandona automáticamente la pantalla abierta. La redirección se realiza también cuando Supabase devuelve un error al cerrar la sesión vencida. Los guards siguen controlando el acceso durante las navegaciones.

Evidencia: `output/verificacion/auth-sesion-activa.jpg` y `output/verificacion/auth-sesion-vencida.jpg`.

## Alcance

Las pruebas automatizadas verifican la lógica local y la comunicación entre servicios, guards y menú. Usan respuestas simuladas de Supabase y un reloj simulado para los casos de vencimiento. Las comprobaciones con la cuenta real se describen por separado. No se crearon nuevas cuentas ni se hicieron compras para esta revisión; los roles empleado/cliente y el registro se comprobaron mediante pruebas automatizadas.
