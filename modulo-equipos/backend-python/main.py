"""FastAPI entry point — módulo de equipos."""
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.routers import equipos, movimientos, visitantes, reportes, dashboard, personas

try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"[WARN] No se pudo sincronizar DB al inicio: {e}")

app = FastAPI(title="Chronogest — Módulo Equipos", version="2.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prefijo global /api para que el frontend no cambie sus endpoints
app.include_router(equipos.router,    prefix="/api")
app.include_router(movimientos.router, prefix="/api")
app.include_router(visitantes.router, prefix="/api")
app.include_router(reportes.router,   prefix="/api")
app.include_router(dashboard.router,  prefix="/api")
app.include_router(personas.router,   prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok", "service": "equipos-python"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=True)
