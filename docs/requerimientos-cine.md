# Requerimientos del proyecto de cine

**Programación IV — TP N.º 1 (2026 C2)**

Este documento reúne los requerimientos del sistema de cine, agrupados por prioridad de desarrollo.

## Prioridad 1 — Núcleo del negocio

### Modelo de datos base

- **Películas:** nombre, imagen, sinopsis, duración, formato (2D, 3D, 4D o 5D), idioma (castellano o subtitulado), uno o varios géneros y restricción de edad (sin restricción, +13 o +18).
- **Salas:** estructura fija de 20 filas por 28 butacas, distribuidas en tres bloques de 4, 20 y 4.
- **Butacas accesibles:** se eliminan las filas centrales J y K para formar una fila accesible con tres bloques de 2, 10 y 2 butacas, respectivamente.
- **Butacas VIP:** corresponden a las últimas tres filas (R, S y T) de cada sala y tienen un precio superior.
- **Funciones:** relacionan una película, una sala y un horario. Entre el final de una función y el inicio de la siguiente en la misma sala debe haber una diferencia mínima de 30 minutos.
- **Asignación automática de sala:** el sistema asigna una sala libre según el horario y no permite superposiciones.

### Usuarios

- El registro solicita correo electrónico, nombre, apellido, fecha de nacimiento, tipo de sangre, color de ojos y días de vacaciones anuales.
- Se permite comprar sin registrarse.
- Las cuentas registradas reciben un descuento configurable por el administrador en su primera compra (20 % inicialmente).
- La restricción de edad debe impedir la compra a menores cuando corresponda e indicar que deben asistir con una persona adulta.

### Flujo de compra

- Permitir seleccionar butacas y mostrar en tiempo real las que están ocupadas o reservadas durante otras compras.
- Diferenciar visualmente las butacas accesibles y VIP.
- Generar la entrada en PDF con sus datos y un código QR.
- Informar claramente si una butaca es VIP antes de confirmar la compra.

### Panel de administración básico

- Administrar películas, salas, funciones, distribución de butacas y productos.
- Diferenciar los roles de administrador (control total) y empleado (permisos operativos).

## Prioridad 2 — Operación diaria

- **Validación de entradas:** el personal empleado puede escanear el QR para el cine o el Candy Bar, o ingresar el código manualmente si falla el lector.
- **Uso único del QR:** invalidarlo después de validar la entrada o entregar el pedido del Candy Bar.
- **Candy Bar:** organizar productos por categorías, permitir comprarlos junto con la entrada y habilitar su retiro con el mismo QR.
- **Buscador:** permitir buscar películas y filtrar por género, incluyendo películas con varios géneros.
- **Página principal:** mostrar primero las tres películas más vendidas.
- **Combos:** ofrecer combinaciones de entrada, pochoclos y bebida a un precio fijo configurable por el administrador, destacadas durante la compra.
- **Cupones avanzados:** permitir al administrador configurar porcentajes y crear cupones exclusivos para usuarios mayores de 50 años.

## Prioridad 3 — Experiencia y valor agregado

- **Reseñas:** permitir calificar con estrellas y dejar un comentario breve; mostrarlas antes de la compra y calcular el promedio por película.
- **Cancelaciones:** permitir cancelar hasta dos horas antes de la función. El importe no se devuelve en efectivo: se acredita como crédito en la cuenta y puede combinarse con otros medios en compras futuras.
- **Usabilidad:** ofrecer interfaces simples para clientes y empleados, un selector de fecha y hora usable (no el calendario nativo señalado como ejemplo negativo) y evitar el desplazamiento excesivo.

## Prioridad 4 — Fidelización, marketing y reportes

- **Puntos:** sumar un punto por cada peso gastado; permitir canjearlos por entradas o productos del Candy Bar. El administrador configura el costo en puntos de cada recompensa. El usuario puede consultar puntos e historial de canjes. Los puntos no son transferibles.
- **Próximamente:** mostrar películas por estrenarse y avisar cuando se habilite la venta de entradas.
- **Preventa:** abrir la venta siete días antes del estreno, con precio especial configurable por película, y volver al precio normal cuando finalice.
- **Mis películas:** mostrar el historial del usuario con pósteres, fechas y sus propias calificaciones.
- **Reportes de administración:** mostrar facturación diaria y cantidad de entradas vendidas; exportar a PDF y Excel; incluir gráficos de películas más vistas por semana o mes y del producto más vendido del Candy Bar.
- **Auditoría:** registrar quién creó una función, modificó un precio o validó un QR, junto con la fecha y hora.

## Prioridad 5 — Opcional o no confirmado

- **Mapa del cine:** mostrar la sala correspondiente a la entrada comprada. El cliente indicó que esta función todavía no está confirmada, por lo que puede dejarse como mejora futura o incluirse si queda tiempo.

## Requerimientos transversales

- Uso correcto de Angular y de las buenas prácticas y técnicas vistas en clase.
- Integración con Supabase para base de datos y, probablemente, autenticación y almacenamiento.
- Integración como PWA.
- Estilo visual propio, no basado en una plantilla genérica.
- Lógica de negocio consistente para horarios, edades, disponibilidad de butacas y uso único de los códigos QR.
