# 🏛️ Documento de Arquitectura y Estructura del Sistema (Cine Wilde)

Este documento es la **guía técnica integral** del proyecto. Explica la arquitectura, la organización de carpetas, los flujos de autenticación, los modelos de datos, la integración con Supabase y los **procedimientos estándar** para ir actualizando el código a medida que se incorporen nuevas funcionalidades.

---

## 📑 Tabla de Contenidos
1. [Visión General & Stack Tecnológico](#1-visión-general--stack-tecnológico)
2. [Estructura de Carpetas y Archivos](#2-estructura-de-carpetas-y-archivos)
3. [Contenedores, Layout y Enrutamiento](#3-contenedores-layout-y-enrutamiento)
4. [Módulo de Autenticación y Usuarios](#4-módulo-de-autenticación-y-usuarios)
5. [Modelos de Datos (TypeScript)](#5-modelos-de-datos-typescript)
6. [Backend y Base de Datos (Supabase / PostgreSQL)](#6-backend-y-base-de-datos-supabase--postgresql)
7. [Sistema de Diseño y Estilos](#7-sistema-de-diseño-y-estilos)
8. [Procedimientos Estándar para Agregar Funcionalidades](#8-procedimientos-estándar-para-agregar-funcionalidades)
9. [Bitácora de Cambios (Changelog)](#9-bitácora-de-cambios-changelog)

---

## 1. Visión General & Stack Tecnológico

El sistema es una aplicación web SPA (Single Page Application) orientada a la compra de entradas y gestión de un cine con múltiples salas.

- **Frontend**: **Angular** (Standalone Components, Signals reactivos, Control Flow `@if`/`@for`, tipado estricto sin `any`).
- **Backend / BaaS**: **Supabase** (PostgreSQL + Auth + Triggers de servidor + Row Level Security + Realtime + Storage).
- **Tipografía**: **Google Sans** y **Google Sans Text** vía CDN.
- **Estilos**: **Vanilla CSS** con Custom Properties (`:root`), paleta sutil basada en **violeta/púrpura y blanco**.

---

## 2. Estructura de Carpetas y Archivos

```plaintext
proyecto-cine/
├── public/                    # Recursos estáticos (favicon, iconos PWA, imágenes públicas)
├── src/
│   ├── app/
│   │   ├── auth/              # Contenedor / Página de autenticación
│   │   │   ├── auth.component.ts
│   │   │   ├── auth.component.html
│   │   │   └── auth.component.css
│   │   │
│   │   ├── componentes/       # Componentes reutilizables / presentacionales
│   │   │   ├── componente-login/
│   │   │   │   ├── componente-login.ts
│   │   │   │   ├── componente-login.html
│   │   │   │   └── componente-login.css
│   │   │   └── componente-registro/
│   │   │       ├── componente-registro.ts
│   │   │       ├── componente-registro.html
│   │   │       └── componente-registro.css
│   │   │
│   │   ├── models/            # Interfaces y tipos de TypeScript (fuente de verdad)
│   │   │   └── user.model.ts  # Tipos de usuario, roles, credenciales, perfil
│   │   │
│   │   ├── pages/             # Vistas/Páginas principales del sistema
│   │   │   ├── inicio/        # Cartelera y destacados
│   │   │   │   ├── inicio.component.ts
│   │   │   │   ├── inicio.component.html
│   │   │   │   └── inicio.component.css
│   │   │   └── home/
│   │   │
│   │   ├── services/          # Lógica de negocio y comunicación con Supabase
│   │   │   ├── auth.ts        # Servicio de autenticación con Signals reactivos
│   │   │   └── auth.spec.ts
│   │   │
│   │   ├── app.ts             # Componente raíz (AppComponent)
│   │   ├── app.html           # Shell visual (Navbar + <router-outlet> + Footer)
│   │   ├── app.css            # Estilos del layout principal
│   │   ├── app.routes.ts      # Configuración de rutas de Angular
│   │   └── app.config.ts      # Providers globales de la aplicación
│   │
│   ├── environments/          # Configuración de variables de entorno
│   │   ├── environment.ts     # URL y anon key de Supabase (prod/dev)
│   │   └── environment.development.ts
│   │
│   ├── index.html             # HTML base (fuente Google Sans y meta viewport)
│   ├── main.ts                # Bootstrap de la aplicación Angular
│   └── styles.css             # Variables globales CSS, reset y tipografía
│
├── angular.json               # Configuración del CLI de Angular
├── package.json               # Dependencias del proyecto
├── tsconfig.json              # Configuración de TypeScript
└── ARQUITECTURA.md            # Este documento
```

---

## 3. Contenedores, Layout y Enrutamiento

### Shell de la Aplicación (`app.ts` / `app.html` / `app.css`)
- Actúa como el **layout maestro** (`.app-layout`).
- Incluye el **Navbar principal** con navegación reactiva:
  - Enlaces a las vistas principales.
  - Renderizado condicional según el estado de autenticación (muestra nombre del usuario y botón de cerrar sesión si está logueado, o botón de *Iniciar Sesión* si es anónimo).
- `<router-outlet>` donde se proyectan las páginas según la URL activa.
- **Footer** institucional.

### Rutas (`app.routes.ts`)
```typescript
export const routes: Routes = [
  { path: '', component: InicioComponent },
  { path: 'login', component: AuthComponent },
  { path: '**', redirectTo: '' },
];
```

---

## 4. Módulo de Autenticación y Usuarios

### Arquitectura Reactiva con Angular Signals
El estado de usuario se gestiona en `AuthService` (`src/app/services/auth.ts`) mediante **Signals**:

```typescript
// Señales de estado primarias
readonly currentUser = signal<User | null>(null);
readonly currentProfile = signal<UserProfile | null>(null);
readonly isLoading = signal<boolean>(false);

// Señales calculadas (computed)
readonly isLoggedIn = computed(() => !!this.currentUser());
readonly userRole = computed<UserRole | null>(() => this.currentProfile()?.rol ?? null);
readonly isAdmin = computed(() => this.userRole() === 'admin');
readonly isEmpleado = computed(() => this.userRole() === 'empleado');
readonly isCliente = computed(() => this.userRole() === 'cliente');
```

### Flujo de Registro Paso a Paso
1. **Usuario completa el formulario** en `ComponenteRegistro` (`componente-registro.html`):
   - Email, contraseña, nombre, apellido, fecha de nacimiento, tipo de sangre, color de ojos y días de vacaciones por año.
2. **Validación y emisión de evento**: `ComponenteRegistro` emite `registerSubmit` con el objeto `RegisterCredentials`.
3. **Controlador contenedor**: `AuthComponent` intercepta el evento y ejecuta `authService.register(credentials)`.
4. **Supabase Auth (`signUp`)**: Se crea el usuario en `auth.users` enviando los metadatos personalizados en `raw_user_meta_data`.
5. **PostgreSQL Trigger (`on_auth_user_created`)**: Se dispara en la base de datos e inserta automáticamente la fila en `public.profiles` con privilegios de `SECURITY DEFINER`.
6. **Sincronización del estado**: `AuthService` carga el perfil recién creado en el signal `currentProfile`.

---

## 5. Modelos de Datos (TypeScript)

Ubicados en [`src/app/models/user.model.ts`](file:///c:/Users/Di%20crocco/Desktop/Programacion4/proyecto-cine/src/app/models/user.model.ts):

```typescript
export type UserRole = 'cliente' | 'empleado' | 'admin';

export type TipoSangre = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export interface UserProfile {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  fechaNacimiento: string;
  tipoSangre?: TipoSangre | string;
  colorOjos?: string;
  diasVacacionesAnio?: number;
  rol: UserRole;
  saldoCredito: number;
  puntosFidelidad: number;
  primeraCompraUsada: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  fechaNacimiento: string;
  tipoSangre: TipoSangre | string;
  colorOjos: string;
  diasVacacionesAnio: number;
}
```

---

## 6. Backend y Base de Datos (Supabase / PostgreSQL)

### Definición de la Tabla `public.profiles`
```sql
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  nombre TEXT,
  apellido TEXT,
  fecha_nacimiento DATE,
  tipo_sangre TEXT,
  color_ojos TEXT,
  dias_vacaciones_anio INTEGER DEFAULT 0,
  rol TEXT DEFAULT 'cliente',
  saldo_credito NUMERIC DEFAULT 0,
  puntos_fidelidad INTEGER DEFAULT 0,
  primera_compra_usada BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Políticas de Seguridad (Row Level Security - RLS)
```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura de perfiles"
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "Permitir actualizar propio perfil"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Permitir insertar propio perfil"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);
```

### Trigger Automático para Nuevos Usuarios
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    nombre,
    apellido,
    fecha_nacimiento,
    tipo_sangre,
    color_ojos,
    dias_vacaciones_anio,
    rol,
    saldo_credito,
    puntos_fidelidad,
    primera_compra_usada
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', ''),
    COALESCE(NEW.raw_user_meta_data->>'apellido', ''),
    CASE 
      WHEN NEW.raw_user_meta_data->>'fecha_nacimiento' IS NOT NULL AND NEW.raw_user_meta_data->>'fecha_nacimiento' <> '' 
      THEN (NEW.raw_user_meta_data->>'fecha_nacimiento')::DATE 
      ELSE NULL 
    END,
    NEW.raw_user_meta_data->>'tipo_sangre',
    NEW.raw_user_meta_data->>'color_ojos',
    COALESCE((NEW.raw_user_meta_data->>'dias_vacaciones_anio')::INTEGER, 0),
    COALESCE(NEW.raw_user_meta_data->>'rol', 'cliente'),
    0,
    0,
    FALSE
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    nombre = EXCLUDED.nombre,
    apellido = EXCLUDED.apellido,
    fecha_nacimiento = EXCLUDED.fecha_nacimiento,
    tipo_sangre = EXCLUDED.tipo_sangre,
    color_ojos = EXCLUDED.color_ojos,
    dias_vacaciones_anio = EXCLUDED.dias_vacaciones_anio;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 7. Sistema de Diseño y Estilos

### Paleta de Colores (Tokens en `:root`)
Ubicada en [`src/styles.css`](file:///c:/Users/Di%20crocco/Desktop/Programacion4/proyecto-cine/src/styles.css):

| Token | Valor Hex | Uso Principal |
|---|---|---|
| `--purple-50` | `#f5f3ff` | Fondos de tags, previews, hover suave |
| `--purple-100` | `#ede9fe` | Bordes suaves, divisores del navbar |
| `--purple-200` | `#ddd6fe` | Bordes de inputs e inputs enfocados |
| `--purple-600` | `#7c3aed` | Color primario, botones de acción, links activos |
| `--purple-700` | `#6d28d9` | Hover de botones principales |
| `--purple-800` | `#5b21b6` | Textos destacados |
| `--purple-900` | `#2e1065` | Títulos principales, fondos oscuros de banners |
| `--bg-page` | `#faf8fd` | Fondo general de toda la aplicación |
| `--text-primary` | `#1e1b2e` | Texto principal de lectura |
| `--text-secondary` | `#6b637b` | Subtítulos y textos secundarios |

---

## 8. Procedimientos Estándar para Agregar Funcionalidades

### Procedimiento A: Agregar una Nueva Entidad o Modelo
1. Crear el archivo en `src/app/models/<nombre>.model.ts`.
2. Declarar las interfaces con tipado estricto (ej. `Pelicula`, `Sala`, `Funcion`, `Butaca`).
3. Crear o actualizar la tabla correspondiente en Supabase mediante SQL Editor.
4. Documentar los campos agregados en este archivo (`ARQUITECTURA.md`).

### Procedimiento B: Crear un Nuevo Servicio
1. Crear el archivo en `src/app/services/<nombre>.service.ts`.
2. Decorar con `@Injectable({ providedIn: 'root' })`.
3. Inyectar `SupabaseClient` (o usar la instancia existente de `AuthService`).
4. Manejar el estado interno con **Signals** (`signal`, `computed`).

### Procedimiento C: Crear una Nueva Página
1. Crear el directorio `src/app/pages/<nombre-pagina>/`.
2. Generar el componente standalone (`.ts`, `.html`, `.css`).
3. Registrar la ruta en `src/app/app.routes.ts`.
4. Si requiere control de acceso por rol (ej. admin o empleado), aplicar guardias de rutas.

### Procedimiento D: Verificación y Compilación
Antes de commitear cambios:
```bash
# 1. Verificar tipos de TypeScript
npx tsc --noEmit

# 2. Levantar el servidor de desarrollo
ng serve
```

---

## 9. Bitácora de Cambios (Changelog)

| Fecha | Versión / Commit | Descripción del Cambio |
|---|---|---|
| 2026-09-13 | `v0.1.0` | Configuración inicial: Angular Standalone + Supabase Auth. |
| 2026-09-13 | `v0.2.0` | Incorporación de campos extendidos en registro (`tipo_sangre`, `color_ojos`, `dias_vacaciones_anio`), modelo `user.model.ts`, trigger en Supabase y estilos unificados en **Google Sans** con paleta **violeta/blanco**. |
| 2026-09-13 | `v0.2.1` | Creación del documento maestro de arquitectura y procedimientos (`ARQUITECTURA.md`). |
