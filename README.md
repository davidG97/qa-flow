<div align="center">
  <img src="public/logo.png" alt="QA Flow Logo" width="120" />
  <h1>🧪 QA Flow</h1>
  <p>Editor visual de pruebas automatizadas con Playwright. Diseña, ejecuta y gestiona tus tests de forma intuitiva mediante un canvas de nodos arrastrables.</p>
  
  <a href="#-guía-de-inicio">Guía de Inicio</a> •
  <a href="#-docker">Docker</a> •
  <a href="#-características">Características</a> •
  <a href="#-api-endpoints">API</a> •
  <a href="https://davidg97.github.io/qa-flow">Landing</a>
</div>

<br />

![React](https://img.shields.io/badge/React-19.2-blue)
![Playwright](https://img.shields.io/badge/Playwright-1.61-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3--6.0-blue)
![Prisma](https://img.shields.io/badge/Prisma-7.8-purple)
![Vite](https://img.shields.io/badge/Vite-8.0-purple)
![License](https://img.shields.io/badge/License-Apache%202.0-blue)

<div align="center">
  <img src="landing/public/screenshots/image.png" alt="QA Flow Editor" width="800" />
</div>

## 📖 Guía de Inicio

### Paso 1: Instalación

```bash
# Clonar el repositorio
git clone https://github.com/davidG97/qa-flow.git
cd qa-flow

# Instalar dependencias
pnpm install

# Configurar base de datos
cp server/.env.example server/.env
pnpm db:migrate
pnpm db:generate

# Iniciar la aplicación
pnpm dev:all
```

Abre http://localhost:3000 en tu navegador.

### Paso 2: Crear tu Primer Proyecto

1. **Inicia sesión** con las credenciales por defecto:
   - Email: `admin@qaflow.com`
   - Password: `admin123`

2. **Crea un proyecto** haciendo click en "Nuevo Proyecto"

3. **Nombra tu proyecto** (ej: "Mi Primera Prueba")

### Paso 3: Diseña tu Test

1. **Arrastra el nodo "Inicio"** desde el panel izquierdo al canvas
   - Configura la URL base (ej: `https://ejemplo.com`)
   - Selecciona el navegador (Chromium, Firefox, WebKit)

2. **Agrega acciones** arrastrando nodos:
   - **Navegar**: Para ir a una URL
   - **Click**: Para hacer click en elementos
   - **Escribir**: Para llenar formularios
   - **Verificar**: Para hacer aserciones

3. **Conecta los nodos** arrastrando desde el punto de salida al punto de entrada del siguiente nodo

### Paso 4: Configura los Selectores

Para cada nodo de acción:

1. Click en el nodo para abrir el panel de propiedades
2. **Opción A - Picker Visual**: Click en el botón 🎯 para seleccionar el elemento visualmente en el navegador
3. **Opción B - Manual**: Escribe el selector CSS/XPath directamente

### Paso 5: Ejecuta tu Test

1. Click en el botón **▶️ Ejecutar** en la barra superior
2. Observa el progreso en tiempo real:
   - 🟢 Verde = Paso exitoso
   - 🔴 Rojo = Paso fallido
   - 🟡 Amarillo = En ejecución

3. Al finalizar, revisa el **reporte HTML** generado automáticamente

### Ejemplo: Test de Login

```
[Inicio] → [Navegar: /login] → [Escribir: email] → [Escribir: password] → [Click: Enviar] → [Verificar: Dashboard visible]
```

<details>
<summary>Ver configuración de cada nodo</summary>

| Nodo | Configuración |
|------|---------------|
| Inicio | URL: `https://miapp.com`, Navegador: Chromium |
| Navegar | Path: `/login` |
| Escribir #1 | Selector: `#email`, Texto: `usuario@test.com` |
| Escribir #2 | Selector: `#password`, Texto: `mipassword` |
| Click | Selector: `button[type="submit"]` |
| Verificar | Selector: `.dashboard`, Tipo: `visible` |

</details>

---

## ✨ Características

- **Editor Visual**: Canvas interactivo con nodos arrastrables para diseñar flujos de prueba
- **Ejecución en Tiempo Real**: Ejecuta tests y observa el progreso en vivo vía WebSocket
- **Múltiples Navegadores**: Soporte para Chromium, Firefox y WebKit
- **Emulación de Dispositivos**: Simula móviles, tablets y diferentes configuraciones
- **Hooks de Playwright**: beforeAll, beforeEach, afterEach, afterAll
- **Ejecución Paralela**: Ejecuta múltiples tests simultáneamente con pool de workers
- **Reportes HTML**: Genera reportes detallados estilo Playwright
- **Generación de Código**: Exporta tus flujos como código Playwright ejecutable
- **Grabación**: Graba interacciones del navegador y conviértelas en nodos
- **Import/Export**: Guarda y comparte tus proyectos en formato JSON
- **Base de Datos**: Persiste proyectos, ejecuciones y resultados
- **Page Objects / Locators**: Gestiona selectores reutilizables organizados por página
- **Autenticación**: Registro, login y control de acceso por roles (Admin / Usuario)

##  Docker

La forma más fácil de desplegar QA Flow en tu infraestructura.

#### Quick Start (SQLite)

```bash
# Clonar y ejecutar
git clone https://github.com/davidG97/qa-flow.git
cd qa-flow

# Crear archivo de configuración
cat > .env << EOF
PORT=3001
NODE_ENV=production
JWT_SECRET=$(openssl rand -base64 32)
EOF

# Iniciar con Docker Compose
docker compose up -d
```

Accede a http://localhost:3001

#### Producción (PostgreSQL)

```bash
# Configuración para producción
cat > .env << EOF
NODE_ENV=production
JWT_SECRET=$(openssl rand -base64 32)
POSTGRES_PASSWORD=$(openssl rand -base64 16)
EOF

# Iniciar con PostgreSQL
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

#### Docker Hub

```bash
# Última versión estable
docker pull davidg97/qa-flow:latest

# Versión específica
docker pull davidg97/qa-flow:1.0.0

# Versión beta (últimas features)
docker pull davidg97/qa-flow:beta
```

**Ejecutar directamente:**
```bash
docker run -d \
  -p 3001:3001 \
  -e JWT_SECRET=$(openssl rand -base64 32) \
  -v qa-flow-data:/app/data \
  davidg97/qa-flow:latest
```

#### Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PORT` | Puerto del servidor | `3001` |
| `NODE_ENV` | Entorno | `production` |
| `JWT_SECRET` | Secret para tokens JWT | ⚠️ Requerido |
| `DATABASE_URL` | URL de conexión a BD | SQLite local |
| `POSTGRES_PASSWORD` | Password PostgreSQL | Solo con `docker-compose.prod.yml` |

## 📁 Estructura del Proyecto

```
qa-flow/
├── src/                      # Frontend React (Vite + React 19)
│   ├── components/           # Componentes UI
│   │   ├── layout/           # Toolbar, Sidebar
│   │   ├── modals/           # Modales de configuración
│   │   ├── nodes/            # Nodos del canvas (React Flow)
│   │   └── panels/           # Paneles laterales
│   ├── pages/                # Rutas de la aplicación (/projects, /locators)
│   ├── hooks/                # Custom hooks
│   ├── types/                # Tipos TypeScript
│   ├── services/             # Cliente REST + WebSocket
│   └── utils/                # Utilidades
│
├── server/                   # Backend Express
│   ├── src/
│   │   ├── config/           # Configuración
│   │   ├── controllers/      # Controladores
│   │   ├── middleware/       # Autenticación y validación
│   │   ├── routes/           # Rutas API
│   │   ├── services/         # Lógica de negocio
│   │   │   ├── executor.service.ts     # Ejecutor Playwright
│   │   │   ├── code-generator.service.ts
│   │   │   ├── recorder.service.ts     # Parseo de código Playwright
│   │   │   ├── database.service.ts
│   │   │   ├── projects.service.ts
│   │   │   └── test-runs.service.ts
│   │   ├── types/            # Tipos compartidos
│   │   ├── websocket/        # WebSocket handler
│   │   └── generated/prisma/ # Cliente Prisma (generado)
│   └── prisma/
│       ├── schema.prisma     # Esquema de base de datos
│       └── migrations/       # Migraciones
```

## 🗄️ Base de Datos

QA Flow usa **Prisma ORM** con SQLite para desarrollo local (compatible con Turso/libsql). Puedes conectar fácilmente a PostgreSQL, MySQL o SQL Server en producción.

### Modelos principales

- **User**: Usuarios del sistema con roles (ADMIN / USER)
- **Project**: Almacena flujos de prueba (nodos, edges, configuración)
- **ProjectMember**: Miembros asociados a un proyecto (OWNER / MEMBER)
- **TestRun**: Registro de ejecuciones
- **TestResult**: Resultados individuales de cada nodo
- **Report**: Reportes HTML generados

### Comandos

```bash
# Desde la raíz del proyecto

# Generar cliente Prisma
pnpm db:generate

# Crear/aplicar migraciones
pnpm db:migrate

# Abrir Prisma Studio (GUI)
pnpm db:studio

# Resetear base de datos
pnpm --filter qa-flow-server db:reset
```

### Conectar a Producción

Edita `server/.env` para cambiar la conexión:

```env
# PostgreSQL (Neon, Supabase, Railway, AWS RDS, Azure)
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"

# MySQL (PlanetScale, AWS RDS)
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE"
```

Luego actualiza el provider en `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"  # o "mysql", "sqlserver"
}
```

## 🎯 Tipos de Nodos

### Triggers
- **Inicio**: Punto de entrada del test con configuración de navegador

### Hooks
- **beforeAll**: Ejecuta antes de todos los tests
- **beforeEach**: Ejecuta antes de cada test
- **afterEach**: Ejecuta después de cada test
- **afterAll**: Ejecuta después de todos los tests

### Acciones
- **Navegar**: Ir a una URL
- **Click**: Hacer click en un elemento
- **Escribir**: Ingresar texto en un input
- **Esperar**: Pausar la ejecución
- **Screenshot**: Capturar pantalla
- **Scroll**: Desplazar página
- **Seleccionar**: Elegir opción de dropdown
- **Hover**: Pasar mouse sobre elemento
- **Presionar Tecla**: Simular teclado

### Aserciones
- **Verificar Texto**: Comprobar contenido
- **Verificar Visible**: Comprobar visibilidad
- **Verificar URL**: Comprobar navegación
- **Verificar Atributo**: Comprobar propiedades

## ⚙️ Opciones de Emulación

El nodo de inicio incluye opciones avanzadas para emular:

- **Dispositivos**: iPhone, Pixel, iPad, Galaxy
- **Viewport**: Ancho, alto, escala
- **Localización**: Idioma, zona horaria
- **Geolocalización**: Latitud, longitud
- **Apariencia**: Tema claro/oscuro, reducedMotion
- **Red**: Modo offline, JavaScript habilitado
- **User Agent**: Personalizado
- **Permisos**: geolocation, notifications, camera

## 📡 API Endpoints

### Autenticación
- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Inicio de sesión
- `GET /api/auth/me` - Usuario autenticado

### Usuarios
- `GET /api/users` - Listar usuarios (admin)

### Proyectos
- `GET /api/projects` - Listar proyectos
- `POST /api/projects` - Crear proyecto
- `GET /api/projects/:id` - Obtener proyecto
- `PUT /api/projects/:id` - Actualizar proyecto
- `DELETE /api/projects/:id` - Eliminar proyecto
- `GET /api/projects/:id/flow` - Obtener flujo de ejecución

### Ejecución
- `POST /api/run` - Ejecutar flujo
- `GET /api/status/:executionId` - Estado de ejecución
- `GET /api/executions` - Listar ejecuciones

### Flujos y Código
- `POST /api/flows` - Guardar flujo
- `POST /api/generate-code` - Generar código Playwright
- `POST /api/parse-code` - Parsear código a nodos

### Grabación
- `POST /api/record/start` - Iniciar grabación
- `GET /api/record/status/:sessionId` - Estado de grabación
- `POST /api/record/stop/:sessionId` - Detener grabación
- `GET /api/record/code/:sessionId` - Obtener código grabado
- `GET /api/record/nodes/:sessionId` - Obtener nodos grabados
- `GET /api/recordings` - Listar grabaciones
- `DELETE /api/recordings/:sessionId` - Eliminar grabación

### Ejecuciones y Reportes
- `GET /api/test-runs` - Listar ejecuciones
- `GET /api/test-runs/:id` - Detalle de ejecución
- `GET /api/test-runs/project/:projectId` - Ejecuciones por proyecto
- `GET /api/test-runs/:id/report` - Reporte HTML de ejecución
- `GET /api/reports` - Listar reportes
- `GET /api/reports/:id` - Obtener reporte HTML

## 🔧 Configuración del Proyecto

En el modal de configuración puedes ajustar:

- **Modo de Ejecución**: Serial o Paralelo
- **Workers**: Número de instancias paralelas
- **Reintentos**: Veces a reintentar tests fallidos
- **Timeout**: Tiempo máximo por acción
- **Max Failures**: Detener después de N fallos

## 🛠️ Scripts

### Frontend
```bash
pnpm dev      # Desarrollo
pnpm build    # Compilar producción
pnpm preview  # Previsualizar build
```

### Backend
```bash
pnpm server          # Desarrollo con hot-reload
pnpm --filter qa-flow-server build   # Compilar TypeScript
pnpm --filter qa-flow-server start   # Iniciar producción
```

### Ambos
```bash
pnpm dev:all    # Frontend + backend simultáneos
pnpm build:all  # Build de todos los paquetes
pnpm test       # Ejecutar tests del servidor
```

## � Seguridad

### Desarrollo Local
El proyecto incluye configuraciones por defecto para facilitar el desarrollo:

- **JWT_SECRET**: Usa un valor por defecto con warning en consola
- **Admin inicial**: Se crea automáticamente con credenciales `admin@qaflow.com` / `admin123`

### Producción
**⚠️ IMPORTANTE**: Antes de desplegar en producción:

1. Configura `JWT_SECRET` en tu `.env`:
   ```env
   JWT_SECRET="tu-secret-seguro-de-al-menos-32-caracteres"
   ```

2. Cambia las credenciales del admin inicial o elimina el usuario

3. Usa HTTPS y configura CORS apropiadamente

## �📄 Licencia

[Apache License 2.0](LICENSE)

---

Desarrollado con ❤️ usando React, Playwright y Prisma
