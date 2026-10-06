# Resultados de la revisión del profesor

Fecha: 6 de octubre de 2026.

## Comprobaciones ejecutadas

| Comprobación | Resultado |
|---|---|
| Compilación final `npx ng build --configuration development` | Correcta, finalizó sin errores |
| `npm test -- --watch=false` | 8 archivos, 37 pruebas aprobadas; salida 0 |
| Alertas en PostgreSQL, con datos temporales y rollback | 5 comprobaciones aprobadas |
| Versión desplegada de crear-usuario-privilegiado | Verificada: cinco campos, sin exigir nacimiento, sangre, ojos ni vacaciones; rechaza contraseña de solo espacios |
| Storage | Bucket peliculas-imagenes y políticas de lectura pública / subida admin verificados |
| Auditoría de promociones | Triggers de configuracion_descuentos y cupones_descuento verificados |
| Realtime | reservas_butacas incluida en supabase_realtime |

La primera ejecución de Vitest agotó el tiempo al iniciar ocho workers y no ejecutó casos. Se agregó vitest.config.mjs y se cambió el script npm test para ejecutar con un único worker de threads. Con esa configuración se aprobaron los 37 casos. No se agregaron dependencias.

## Qué cubren las pruebas unitarias

- Alertas del servicio: sesión requerida, invitado sin consulta, upsert usuario/película, error de guardado, filtro por usuario, mapeo de disponibilidad.
- Inicio: redirección del invitado, mensaje de éxito/estado después de guardar, error sin marcar una alerta como activada.
- Usuarios admin: campos con solo espacios, correo inválido, contraseña corta, envío de únicamente cinco campos, limpieza y error del servidor.
- Cupones: código normalizado, edición por ID, porcentajes fuera de rango/no finitos/exceso de decimales, código reservado.
- Imágenes: permiso admin, formatos, tamaño máximo, archivo vacío, subida sin sobrescribir, URL resultante y error de Storage.
- Fecha: separación de segmentos, fecha imposible, limpieza de caracteres, salida ISO y comprobación defensiva del pipe.
- Pruebas existentes: creación de App, marca del cine y ticket con QR/descuento/descarga.

Las pruebas unitarias usan respuestas simuladas de Supabase; verifican el comportamiento de Angular sin crear compras ni cuentas reales. No prueban por sí solas las políticas del servidor.

## Prueba real de alertas

Script: [alertas-estreno.sql](C:/Users/uld001/Desktop/Programacion-4-TP-N-1/supabase/tests/alertas-estreno.sql).

Se comprobaron: ausencia de duplicados, estreno pendiente sin funciones, disponibilidad al estar en cartelera, disponibilidad con función futura y filtro para que otra identidad no reciba esa alerta. BEGIN/ROLLBACK revierte las filas y los logs generados durante la prueba.

La primera prueba detectó que log_actividad.usuario_id no admitía null, aunque el trigger toma auth.uid() y SQL Editor puede ejecutar sin usuario Auth. Se corrigió la columna para permitir actor Sistema, se repitió la prueba y pasó.

![Resultado de la prueba real de alertas](C:/Users/uld001/Desktop/Programacion-4-TP-N-1/output/verificacion/supabase-alertas.jpg)

## Cambios de servidor aplicados

- Edge Function de alta administrativa: validación de los cinco campos y asignación del rol con la clave de servidor.
- Bucket de pósters públicos, con límite de 5 MB y JPG/PNG/WebP; subida restringida a administradores.
- Triggers de auditoría para las dos tablas nuevas de descuentos.
- Actor nulo permitido en log_actividad para procesos de sistema.
- La migración de cupones ya estaba aplicada al revisar el panel; se verificó la RPC de seis parámetros y el porcentaje inicial 20.

Fuentes locales reproducibles: supabase/functions/crear-usuario-privilegiado/index.ts, supabase/sql/cupones-configurables.sql y supabase/sql/imagenes-y-auditoria-descuentos.sql.

![Configuración de Storage y auditoría verificada](C:/Users/uld001/Desktop/Programacion-4-TP-N-1/output/verificacion/supabase-imagenes-auditoria.jpg)

## Alcance práctico

Se verificó la compilación de desarrollo; esta ejecución no certifica los límites de tamaño del build de producción. No se realizó una compra/cobro real ni se crearon cuentas de personal reales para probar el alta. No se hizo una subida interactiva de archivo usando una cuenta administradora en Angular ni una demostración simultánea con dos navegadores de reservas. Las alertas se muestran dentro de la aplicación; no existe envío de correo/push en ese flujo.

La prueba SQL de alertas comprueba la RPC y su filtro por auth.uid(); usa la conexión administrativa del SQL Editor y no representa una prueba exhaustiva de las políticas RLS para todos los roles.

Material de estudio completo: [guia-profesor.md](C:/Users/uld001/Desktop/Programacion-4-TP-N-1/docs/guia-profesor.md).
