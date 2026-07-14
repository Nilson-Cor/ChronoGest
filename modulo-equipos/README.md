# Módulo: Gestión de Entrada y Salida de Equipos — SENA

Módulo independiente para el control de ingreso y salida de equipos tecnológicos en el SENA. **No modifica el sistema principal Chronogest**, solo consume sus APIs.

## Arquitectura

```
modulo-equipos/
├── backend/      NestJS 11 — Puerto 3001
├── frontend/     React 18 + Vite — Puerto 5173
└── docker-compose.yml
```

### Integración con el sistema principal
- **Login**: usa el endpoint `/api/auth/login` del backend principal (puerto 3000)
- **Personas**: consulta `/api/personas` del backend principal
- **JWT**: valida el mismo token emitido por el sistema principal (misma `JWT_SECRET`)
- **Base de datos propia**: PostgreSQL separada en puerto 5436 (no toca la BD de horarios)

## Puertos

| Servicio              | Puerto |
|-----------------------|--------|
| Sistema principal API | 3000   |
| Sistema principal Web | 4200   |
| **Equipos API**       | **3001** |
| **Equipos Web**       | **5173** |
| **Equipos DB**        | **5436** |

## Arranque rápido (desarrollo local)

### 1. Levantar la base de datos
```bash
cd modulo-equipos
docker-compose up equipos-db -d
```

### 2. Backend
```bash
cd modulo-equipos/backend
cp .env.example .env
# Editar .env: poner el mismo JWT_SECRET que usa el sistema principal
npm install
npm run start:dev
```

### 3. Frontend
```bash
cd modulo-equipos/frontend
cp .env.example .env
npm install
npm run dev
```

Abrir: http://localhost:5173 — usar las mismas credenciales del sistema principal.

## Variables de entorno

### Backend (`backend/.env`)
```env
PORT=3001
DB_HOST=localhost
DB_PORT=5436
DB_USER=postgres
DB_PASS=postgres
DB_NAME=equipos_db
JWT_SECRET=       # MISMO valor que usa el backend principal
MAIN_API_URL=http://localhost:3000/api
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:3001/api
VITE_MAIN_API_URL=http://localhost:3000/api
```

## Módulos del backend

| Módulo        | Endpoints principales |
|---------------|-----------------------|
| `equipos`     | CRUD, filtros por persona/tipo/estado/serial |
| `movimientos` | Registrar entrada/salida, historial con filtros |
| `visitantes`  | CRUD visitantes externos |
| `reportes`    | Reportar anomalías, marcar como resuelto |
| `dashboard`   | Stats en tiempo real |
| `personas`    | Proxy hacia la API del sistema principal |

## Páginas del frontend

| Página        | Ruta           | Descripción |
|---------------|----------------|-------------|
| Login         | `/login`       | Autenticación con credenciales del sistema principal |
| Dashboard     | `/dashboard`   | Estadísticas y últimos movimientos |
| Portería      | `/porteria`    | Registro de entrada/salida (QR en desarrollo + búsqueda manual) |
| Equipos       | `/equipos`     | Gestión de equipos por persona |
| Movimientos   | `/movimientos` | Historial completo con filtros |
| Visitantes    | `/visitantes`  | Gestión de visitantes externos |
| Reportes      | `/reportes`    | Reporte y seguimiento de anomalías |

## Funcionalidad QR

La pestaña de escaneo QR en Portería está marcada como **EN DESARROLLO**. La estructura está completamente lista para integrarse con un lector QR físico o por cámara. Cuando se cuente con el hardware, solo se debe implementar la lógica de captura en `PorteriaPage.tsx`.

## Stack tecnológico

- **Backend**: NestJS 11, TypeORM, PostgreSQL, Passport JWT
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS v4, Axios, react-hot-toast
- **Auth**: JWT compartido con el sistema principal (sin tabla de usuarios propia)
