# Decisiones técnicas de WildeCinemas

Este documento describe las soluciones implementadas, sus motivos técnicos y su alcance. Complementa la arquitectura del [README](../README.md).

## 1. Componentes standalone y carga por rutas

**Decisión:** utilizar componentes standalone y `loadComponent` en las rutas.

**Motivo:** cada pantalla declara sus dependencias y se carga al navegar hacia ella. Esto facilita organizar la interfaz por funcionalidad sin concentrar las declaraciones en un módulo general.

**Dónde:** `src/app/app.routes.ts` y `src/app/pages`.

## 2. Separación de componentes, servicios y modelos

**Decisión:** ubicar presentación e interacción en componentes, consultas y coordinación en servicios, y contratos de datos en interfaces.

**Motivo:** permite cambiar una consulta sin reorganizar el HTML y reutilizar operaciones desde varias pantallas. Los modelos indican qué estructura se recibe y se utiliza.

**Alcance:** la separación es gradual. AdminUsuarios y ValidarQr mantienen llamadas específicas al cliente compartido. PeliculasCrudService también coordina estado de interfaz.

**Dónde:** `pages`, `core/services` y `models`.

## 3. Signals para estado y valores derivados

**Decisión:** utilizar `signal` para datos y estados y `computed` para valores derivados, como rol, subtotal y restricciones de compra.

**Motivo:** Angular actualiza la vista cuando cambia el estado; los valores derivados siguen sus dependencias sin mantener copias manuales que puedan quedar desactualizadas.

**Alcance:** los signals mantienen estado en memoria. La persistencia corresponde a Supabase y las consultas siguen requiriendo manejo de errores.

**Dónde:** servicios de autenticación y componentes de películas, butacas y administración.

## 4. Una instancia compartida de Supabase

**Decisión:** crear el cliente en AuthService y reutilizarlo mediante `client`.

**Motivo:** las operaciones comparten configuración y contexto de autenticación. Se evita crear clientes independientes en cada servicio.

**Alcance:** el acceso a datos depende de AuthService. Separar la conexión en otro servicio requeriría adaptar sus consumidores.

**Dónde:** `core/services/auth.service.ts` y servicios de datos.

## 5. Autenticación, perfil y sesión separados

**Decisión:** conservar AuthService como coordinador y delegar perfil y duración en PerfilService y SesionService.

**Motivo:** autenticar credenciales, consultar el perfil y manejar temporizadores son responsabilidades distintas. La división permite modificar cada parte conservando la interfaz que utilizan componentes y guards.

PerfilService recibe cliente y usuario como argumentos. SesionService recibe funciones para consultar el usuario y solicitar el cierre. Esto evita que ambos inyecten AuthService y formen una dependencia circular.

**Dónde:** los tres servicios en `core/services`.

## 6. Descartar respuestas antiguas del perfil

**Decisión:** utilizar un contador de consultas en PerfilService.

**Motivo:** una petición puede terminar después del cierre de sesión o después de otra petición más reciente. El contador evita que esa respuesta restaure o sobrescriba el perfil actual.

**Alcance:** descarta la actualización del estado; no cancela la petición de red.

**Dónde:** `PerfilService.cargar` y `limpiar`.

## 7. Duración máxima local de siete minutos

**Decisión:** guardar el instante inicial en localStorage y verificar vencimiento con un temporizador, al recuperar sesión y al volver a la pestaña.

**Motivo:** actualizar la página o renovar un token no debe reiniciar el plazo. La comprobación al volver a la pestaña detecta vencimiento aunque el navegador haya pausado el temporizador.

Al vencer, AuthService solicita el cierre local, limpia usuario y perfil y navega al inicio.

**Alcance:** es un control del navegador, no un límite impuesto por Supabase. Cuenta desde el inicio guardado; no es un tiempo de inactividad.

**Dónde:** `SesionService` y `AuthService.cerrarSesionLocal`.

## 8. Guards, visibilidad y autorización

**Decisión:** proteger rutas con guards, mostrar acciones según rol y comprobar permisos de datos en el servidor.

**Motivo:** el guard decide si se abre una pantalla; la directiva y el HTML controlan su presentación; RLS, RPC y Edge Functions autorizan la operación sobre los datos.

Los guards esperan `whenReady()` para evaluar el estado después de recuperar sesión y perfil.

**Dónde:** `core/guards`, `SoloAdminDirective`, layout y controles de Supabase.

## 9. Formularios según la pantalla

**Decisión:** combinar formularios reactivos en registro y formularios basados en plantilla en varias pantallas simples y administrativas.

**Motivo:** el registro reúne controles y validaciones explícitos en un FormGroup. NgModel permite vincular campos sencillos con el formulario de cada pantalla.

**Alcance:** la validación del cliente orienta al usuario; las operaciones sensibles también validan en el servidor.

**Dónde:** `pages/auth/registro` y formularios administrativos.

## 10. Fechas editables por segmentos

**Decisión:** utilizar SelectorFechaComponent con día, mes y año e integración mediante ControlValueAccessor.

**Motivo:** permite editar cada segmento sin abrir un calendario y reutilizar el mismo control con formularios reactivos y NgModel.

Comunica una fecha ISO válida o un valor vacío. FechaArgentinaPipe presenta las fechas y evita cambios de día al mostrar valores sin hora.

**Alcance:** un pipe no sustituye las validaciones de campos ni las reglas del servidor. Reportes utiliza períodos predefinidos.

**Dónde:** `shared/components/selector-fecha` y `shared/pipes`.

## 11. Operaciones de negocio mediante RPC

**Decisión:** ejecutar operaciones relacionadas en funciones PostgreSQL.

**Motivo:** comprar requiere validar reservas, calcular importes y registrar orden y entradas. Agrupar estas acciones en el servidor permite usar transacciones y aplicar las mismas reglas a todas las solicitudes.

Las consultas sencillas y algunos CRUD acceden a tablas con RLS. Las RPC se utilizan cuando hace falta coordinación o validación adicional.

**Dónde:** compras, reservas, programación, cancelaciones, eliminación de salas y reportes.

**Alcance:** el repositorio contiene solo parte del SQL; reproducir el backend requiere obtener las definiciones históricas existentes.

## 12. Reservas, Realtime y refresco periódico

**Decisión:** reservar butacas temporalmente en el servidor, escuchar cambios por función y consultar disponibilidad cada 15 segundos.

**Motivo:** varios usuarios pueden seleccionar asientos simultáneamente. Las reservas coordinan la selección; Realtime avisa cambios y la consulta periódica refresca vencimientos o cambios sin aviso inmediato.

El evento Realtime provoca una nueva consulta. Al salir se retiran canal y temporizador y se intenta liberar la selección.

**Alcance:** la vista puede quedar momentáneamente desactualizada. La validación definitiva se realiza en el servidor al reservar y comprar.

**Dónde:** ButacasService y ButacasComponent.

## 13. Asignación automática y separación de funciones

**Decisión:** asignar la sala mediante `crear_funcion_con_sala_automatica`, considerando compatibilidad, disponibilidad e intervalo mínimo de 30 minutos.

**Motivo:** centraliza la elección de sala y evita superposiciones. La duración de la película determina el final; el intervalo deja margen antes de la siguiente función.

**Alcance:** SalasFuncionesService envía los datos; PostgreSQL resuelve la asignación y restricciones. Exactamente 30 minutos cumple el mínimo.

**Dónde:** `SalasFuncionesService.crearFuncion` y funciones/triggers de Supabase.

## 14. Eliminación atómica de salas

**Decisión:** eliminar sala y butacas mediante `eliminar_sala_sin_funciones`.

**Motivo:** llamadas independientes pueden dejar un borrado incompleto. La RPC comprueba administración, rechaza salas con funciones y conserva la consistencia de las filas relacionadas.

**Dónde:** SalasFuncionesService y `supabase/sql/eliminar-sala-sin-funciones.sql`.

## 15. Creación administrativa mediante Edge Function

**Decisión:** crear cuentas desde una función de servidor que recibe nombre, apellido, correo, contraseña y rol.

**Motivo:** crear usuarios y asignar roles requiere capacidades privilegiadas que no deben exponerse en Angular. La función valida al solicitante, valida los campos y coordina Auth y perfil.

Si falla la asignación del perfil, intenta eliminar la cuenta recién creada. La auditoría no incluye la contraseña.

**Alcance:** esta compensación utiliza servicios separados; no equivale a una transacción única entre Auth y PostgreSQL.

**Dónde:** AdminUsuariosComponent y `supabase/functions/crear-usuario-privilegiado/index.ts`.

## 16. Descuentos configurables en el servidor

**Decisión:** guardar porcentaje de primera compra y cupones en tablas, y calcular el descuento en la RPC de compra.

**Motivo:** el administrador puede cambiar promociones sin modificar ni publicar el frontend. El servidor verifica elegibilidad y calcula el importe definitivo con datos persistidos.

Los descuentos no se acumulan: se aplica el mayor beneficio elegible. Los cupones para mayores de 50 requieren sesión y nacimiento registrado; la condición es edad cumplida mayor que 50, desde 51 años.

**Alcance:** la regla comprueba edad, no condición de jubilado. El comprobante conserva el porcentaje aplicado.

**Dónde:** CuponesService, configuración, ComprasService y `supabase/sql/cupones-configurables.sql`.

## 17. Pósters en Storage con nombres únicos

**Decisión:** conservar la opción URL y permitir subir JPG, PNG o WebP de hasta 5 MB, con UUID y sin sobrescribir.

**Motivo:** el administrador puede usar archivos locales y la película sigue guardando una URL. Los nombres únicos evitan colisiones; la lectura pública permite mostrar pósters a visitantes.

El cliente valida el archivo y las políticas del bucket restringen la subida a administración.

**Alcance:** no hay limpieza automática de archivos subidos que luego no se guardan en una película.

**Dónde:** ImagenesService, FormularioPeliculaComponent y script de Storage.

## 18. Reportes con períodos y consultas paralelas

**Decisión:** ofrecer Hoy, 7 y 30 días, con 30 días al entrar, y ejecutar cuatro consultas mediante Promise.all.

**Motivo:** los períodos simplifican la selección y eliminan fechas incompletas o rangos invertidos. Las consultas independientes pueden ejecutarse en paralelo.

El componente calcula fechas y actualiza señales; ReportesService obtiene ventas diarias, películas, productos y actividad. Actualizar consulta el rango guardado. Si una consulta falla, no se aplica el conjunto como una carga completa.

**Alcance:** actividad reciente no recibe el filtro de fechas. El cálculo actual usa toISOString, que representa UTC. Se retiró la confirmación de pagos pendientes porque la compra actual ya confirma la orden en el servidor.

**Dónde:** AdminReportesComponent, ReportesService y reportes.model.ts.

## 19. CSV y generación de PDF

**Decisión:** descargar ventas diarias como CSV, imprimir reportes con el navegador y generar tickets mediante jsPDF.

**Motivo:** CSV permite abrir la tabla en Excel sin una biblioteca de hojas de cálculo. Imprimir aprovecha el contenido y estilos del reporte; jsPDF permite construir un comprobante con distribución propia y QR.

El CSV usa punto y coma, comillas escapadas y BOM para los acentos. Se genera un Blob, se descarga con una URL temporal y se libera esa URL.

**Alcance:** CSV no es `.xlsx` y contiene únicamente ventas diarias. El PDF de reportes requiere elegir Guardar como PDF en el diálogo del navegador. Sus barras se dibujan con CSS.

**Dónde:** ReportesService.exportarVentasCsv, AdminReportesComponent.imprimir, estilos de impresión y TicketComponent.

## 20. Auditoría en el backend

**Decisión:** combinar triggers y registros explícitos de operaciones en log_actividad.

**Motivo:** los cambios se registran junto con las operaciones persistidas, incluso si una escritura no proviene de una pantalla concreta. Los registros explícitos describen acciones como la creación de usuarios.

Las operaciones sin usuario autenticado pueden tener actor nulo y se muestran como Sistema. Reportes consulta mediante obtener_log_actividad_admin.

**Alcance:** no se registra cada clic, lectura o mensaje de consola. Parte de las definiciones está en Supabase y no figura en los scripts locales.

**Dónde:** triggers/RPC, Edge Function de usuarios, script de auditoría de descuentos y ReportesService.

## 21. Comprobante en navegación y sessionStorage

**Decisión:** entregar el comprobante mediante navegación y mantener un respaldo en sessionStorage.

**Motivo:** Ticket puede mostrar la respuesta de compra y recuperarla al actualizar la misma pestaña sin repetir la operación.

**Alcance:** un enlace abierto desde otro navegador no recupera los datos. Una recuperación independiente requeriría una consulta autorizada del comprobante al backend.

**Dónde:** ButacasComponent y TicketComponent.
