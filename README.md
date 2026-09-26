Requerimientos del Proyecto — Sistema de Cine
Programación IV — TP N°1 (2026 C2)

Documento elaborado a partir del intercambio de mails con el cliente ("Empresario Importante"). Los requerimientos están agrupados por nivel de prioridad para el desarrollo, es decir, el orden sugerido para codear: primero lo que sostiene el negocio (modelo de datos y flujo de compra), después lo que lo completa, y al final lo accesorio / fidelización / reportería.

Prioridad 1 — Núcleo del negocio (sin esto no hay app)

Modelo de datos base

Películas: nombre, imagen, sinopsis, duración, formato (2D/3D/4D/5D), idioma (castellano/subtitulado), uno o varios géneros, restricción de edad (sin restricción, +13, +18).
Salas: estructura fija de 20 filas (letras) x 3 columnas de 4, 20 y 4 butacas.
Ajuste posterior: se eliminaron las filas centrales J y K para crear una fila de butacas accesibles (quedan 2, 10 y 2 butacas accesibles por columna).
Butacas VIP en las últimas 3 filas (R, S, T) de cada sala, precio más alto.
Funciones: película + sala + horario. Debe respetar 30 minutos de diferencia entre el fin de una función y el inicio de otra en la misma sala.
Asignación automática de sala: el sistema elige la sala libre según el horario, sin permitir superposición de funciones en una misma sala.

Usuarios

Registro: mail, nombre, apellido, fecha de nacimiento, tipo de sangre, color de ojos, días de vacaciones anuales.
Compra anónima permitida (sin registro).
Beneficio por registrarse: cupón de 20% en primera compra (configurable por admin).
Restricción por edad: bloquear compra de entradas +13/+18 a menores; aclarar en la entrada que debe acompañar un adulto.

Flujo de compra

Selección de butacas en tiempo real (ver ocupadas por otras compras en curso).
Butacas accesibles y VIP resaltadas visualmente distinto al resto.
Generación de PDF de la entrada con los datos y código QR.
El usuario debe poder saber claramente que está comprando una butaca VIP antes de pagar.

Panel de administración (básico)

CRUD de películas, salas, funciones, distribución de butacas y productos.
Rol admin (control total) vs rol empleado (ver Prioridad 2).
Prioridad 2 — Completar la operación diaria
Validación de entradas: usuarios "empleado" escanean el QR (cine y candy bar) o lo ingresan manualmente si el lector falla.
El QR se invalida una vez usado (tanto al validar entrada como al entregar comida).
Candy bar: productos organizados en categorías, compra conjunta con la entrada, retiro con el mismo QR.
Buscador de películas con filtro por género (multi-género).
Página principal: mostrar primero las 3 películas más vendidas.
Combos (entrada + pochoclos + bebida) a precio fijo configurable por admin, destacados en la página de compra.
Cupones avanzados: admin configura el % en cualquier momento, y puede crear cupones exclusivos para usuarios +50 años.
Prioridad 3 — Experiencia de usuario y funciones de valor agregado
Reseñas: calificación con estrellas + comentario corto, visibles antes de comprar entradas; promedio de puntuación por película.
Cancelación de compra hasta 2 horas antes de la función: no hay devolución de dinero, se acredita como crédito en la cuenta, combinable con otros medios de pago en compras futuras.
UX obligatoria: interfaces simples de navegar (clientes y empleados), selector de fecha/hora usable (NO el input nativo tipo calendario mostrado como ejemplo negativo), evitar scroll excesivo.
Prioridad 4 — Fidelización, marketing y reportes (una vez que el core funciona)
Programa de puntos: 1 punto por cada peso gastado; canje por entradas gratis o productos de candy bar; admin configura el costo en puntos de cada recompensa; el usuario ve puntos acumulados e historial de canjes; los puntos no son transferibles.
Sección "Próximamente": películas a estrenar; alerta/notificación cuando se habilite la venta de entradas.
Preventa: apertura de venta 7 días antes del estreno con precio especial, configurable por película, vuelve a precio normal al vencer.
Sección "Mis películas": historial visual del usuario (pósters, fechas, su propia calificación).
Reportes de admin: facturación diaria y cantidad de entradas vendidas; exportación a PDF y Excel; gráfico de películas más vistas (semanal/mensual) y producto de candy bar más vendido.
Log de actividad en el admin: quién creó una función, quién modificó un precio, quién validó un QR, con fecha y hora.
Prioridad 5 — Opcional / no confirmado por el cliente
Pantalla con mapa del cine que indique la sala de la entrada comprada (el cliente aclaró que todavía no tiene luz verde; no es un requerimiento firme, se puede dejar como mejora futura o incluirlo si sobra tiempo).
Transversales (aplican durante todo el desarrollo, no son una etapa aparte)
Uso correcto de Angular y buenas prácticas / técnicas vistas en clase.
Integración con Supabase (base de datos, y probablemente auth/storage).
Integración PWA.
Estilo visual propio y producido (no template genérico).
Lógica de negocio consistente con todas las reglas anteriores (horarios, edades, stock de butacas, QR de un solo uso, etc.).