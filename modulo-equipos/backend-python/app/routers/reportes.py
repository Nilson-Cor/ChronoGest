"""Router de reportes."""
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..models import Reporte, Equipo
from ..schemas import CreateReporteDto, ResolverReporteDto
from ..auth import get_current_user

router = APIRouter(prefix="/reportes", tags=["reportes"])


def _split_nombre(nombre_completo: Optional[str]) -> Optional[dict]:
    """Convierte 'Nombre Apellido' en {nombre, apellido} para el frontend."""
    if not nombre_completo:
        return None
    partes = nombre_completo.strip().split(" ", 1)
    return {"nombre": partes[0], "apellido": partes[1] if len(partes) > 1 else ""}


def _ser(r: Reporte) -> dict:
    eq = r.equipo
    return {
        "id":                  str(r.id),
        "equipoId":            str(r.equipo_id),
        "tipo":                r.tipo,
        "descripcion":         r.descripcion,
        "estado":              r.estado,
        "reportadoPorNombre":  r.reportado_por_nombre,
        "reportadoPor":        _split_nombre(r.reportado_por_nombre),
        "resolucion":          r.resolucion,
        "fechaReporte":        r.fecha_reporte.isoformat()    if r.fecha_reporte    else None,
        "fechaResolucion":     r.fecha_resolucion.isoformat() if r.fecha_resolucion else None,
        "equipo": {
            "id":     str(eq.id),
            "tipo":   eq.tipo,
            "marca":  eq.marca,
            "modelo": eq.modelo,
            "serial": eq.serial,
        } if eq else None,
    }


@router.get("", response_model=None)
def get_reportes(
    estado: Optional[str] = Query(None),
    db:     Session = Depends(get_db),
    user:   dict    = Depends(get_current_user),
):
    q = db.query(Reporte).options(joinedload(Reporte.equipo))
    if estado:
        q = q.filter(Reporte.estado == estado)
    return [_ser(r) for r in q.order_by(Reporte.fecha_reporte.desc()).all()]


@router.get("/{id}", response_model=None)
def get_reporte(id: str, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    r = db.query(Reporte).options(joinedload(Reporte.equipo)).filter(Reporte.id == id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    return _ser(r)


@router.post("", response_model=None, status_code=201)
def create_reporte(body: CreateReporteDto, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    eq = db.query(Equipo).filter(Equipo.id == body.equipoId).first()
    if not eq:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    nombre = (
        user.get("nome") or user.get("nombre") or user.get("name")
        or user.get("sub") or user.get("idPersona") or "Sistema"
    )
    reportado_por = user.get("sub") or user.get("idPersona") or user.get("id") or nombre
    r = Reporte(
        id                   = str(uuid.uuid4()),
        equipo_id            = body.equipoId,
        tipo                 = body.tipo,
        descripcion          = body.descripcion,
        estado               = "ACTIVO",
        reportado_por        = reportado_por,
        reportado_por_nombre = nombre,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    # Recargar con relación
    r = db.query(Reporte).options(joinedload(Reporte.equipo)).filter(Reporte.id == r.id).first()
    return _ser(r)


@router.put("/{id}/resolver", response_model=None)
def resolver_reporte(id: str, body: ResolverReporteDto, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    from datetime import datetime, timezone
    r = db.query(Reporte).filter(Reporte.id == id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    r.resolucion      = body.resolucion
    r.estado          = "RESUELTO"
    r.fecha_resolucion= datetime.now(timezone.utc)
    db.commit()
    r = db.query(Reporte).options(joinedload(Reporte.equipo)).filter(Reporte.id == id).first()
    return _ser(r)


@router.delete("/{id}")
def delete_reporte(id: str, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    r = db.query(Reporte).filter(Reporte.id == id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    db.delete(r)
    db.commit()
    return {"message": f"Reporte {id} eliminado"}
